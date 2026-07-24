import {
  BadRequestException,
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { Rol, Area, Turno } from '@prisma/client';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AlumnosService } from './alumnos.service';
import type { SemestreImportRow } from './alumnos.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';
import { FilterAlumnosDto } from './dto/filter-alumnos.dto';
import { VincularApoderadoDto } from './dto/vincular-apoderado.dto';

/* ─── Parseo del CSV oficial de matrícula (formato semestre) ─────── */

const NUM_A_AREA: Record<string, Area> = {
  '1': Area.ciencias,
  '2': Area.letras,
  '3': Area.medicas,
};

/** Divide una línea CSV respetando comillas y escapes `""`. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Normaliza un encabezado (sin acentos, minúsculas) para casar columnas. */
function normHeader(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

/**
 * Parsea el CSV oficial. El archivo viene DOBLE-codificado: cada fila es un
 * único campo CSV entrecomillado con las comillas internas duplicadas. Se
 * des-envuelve (parse → si da 1 sola columna con comas, se re-parsea) y luego
 * se mapea por nombre de columna (tolerante a orden/acentos).
 */
function parseSemestreCsv(buffer: Buffer): SemestreImportRow[] {
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (rawLines.length < 2) return [];

  const fields = (raw: string): string[] => {
    let f = parseCsvLine(raw);
    if (f.length === 1 && f[0].includes(',')) f = parseCsvLine(f[0]);
    return f;
  };

  const header = fields(rawLines[0]).map(normHeader);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => { if (!(h in idx)) idx[h] = i; });
  const at = (cols: string[], name: string): string => {
    const i = idx[name];
    return i == null ? '' : (cols[i] ?? '').trim();
  };

  const rows: SemestreImportRow[] = [];
  for (let r = 1; r < rawLines.length; r++) {
    const cols = fields(rawLines[r]);
    const dni = at(cols, 'dni').replace(/\D/g, '');
    if (!dni) continue; // fila vacía o sin DNI

    const apNombre  = at(cols, 'nombre apoderado');
    const montoRaw  = at(cols, 'monto de cuota').replace(/[^\d.]/g, '');
    const monto     = montoRaw ? parseFloat(montoRaw) : undefined;
    const vm        = parseInt(at(cols, 'veces matriculado'), 10);
    const q         = at(cols, 'quinto');

    rows.push({
      fila:              r + 1,
      dni,
      nombres:           at(cols, 'nombre'),
      apellidos:         `${at(cols, 'apellido paterno')} ${at(cols, 'apellido materno')}`.trim(),
      codigoInscripcion: at(cols, 'codigo de inscripcion') || undefined,
      telefono:          at(cols, 'numero de celular') || undefined,
      email:             at(cols, 'email') || undefined,
      area:              NUM_A_AREA[at(cols, 'area de carrera')],
      carrera:           at(cols, 'carrera') || undefined,
      turno:             at(cols, 'nombre de turno').toUpperCase().includes('TARDE') ? Turno.tarde : Turno.manana,
      colegio:           at(cols, 'colegio') || undefined,
      quinto:            q === '' ? undefined : (q === '1' || /^(s[ií]|true)$/i.test(q)),
      vecesMatriculado:  Number.isNaN(vm) ? undefined : vm,
      fechaMatricula:    at(cols, 'created_at') || undefined,
      apoderado:         apNombre
        ? { nombre: apNombre, apellidos: `${at(cols, 'apellido paterno apoderado')} ${at(cols, 'apellido materno apoderado')}`.trim() }
        : undefined,
      pago: {
        tipoPago:    at(cols, 'tipo de pago') || undefined,
        banco:       at(cols, 'banco o tesoreria') || undefined,
        codigoCuota: at(cols, 'codigo de cuota') || undefined,
        fechaCuota:  at(cols, 'fecha de cuota') || undefined,
        monto:       Number.isNaN(monto as number) ? undefined : monto,
      },
    });
  }
  return rows;
}

@ApiTags('Alumnos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alumnos')
export class AlumnosController {
  constructor(private readonly service: AlumnosService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Listar alumnos paginados con filtros' })
  findAll(@Query() dto: FilterAlumnosDto) {
    return this.service.findAll(dto);
  }

  // Buscar un alumno por DNI (para autocompletar al registrar). Se declara antes
  // de `:id` para que la ruta estática no la capture el parámetro dinámico.
  @Get('buscar-por-dni')
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Buscar un alumno existente por DNI (incluye dados de baja)' })
  buscarPorDni(@Query('dni') dni: string) {
    return this.service.buscarPorDni(dni);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Detalle de un alumno' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Crear alumno' })
  create(@Body() dto: CreateAlumnoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Actualizar alumno' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAlumnoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar alumno (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Reactivar alumno dado de baja (revierte soft delete)' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.restore(id);
  }

  // ── Apoderados de un alumno ───────────────────────────────────────

  @Get(':id/apoderados')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Listar apoderados vinculados a un alumno' })
  getApoderados(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getApoderados(id);
  }

  @Post(':id/apoderados')
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Vincular apoderado a un alumno (nuevo o existente)' })
  vincularApoderado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VincularApoderadoDto,
  ) {
    return this.service.vincularApoderado(id, dto);
  }

  @Delete(':id/apoderados/:apoderadoId')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Desvincular apoderado de un alumno' })
  desvincularApoderado(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('apoderadoId', ParseUUIDPipe) apoderadoId: string,
  ) {
    return this.service.desvincularApoderado(id, apoderadoId);
  }

  // ── Foto de perfil ────────────────────────────────────────────

  @Post(':id/foto')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Subir / reemplazar foto de perfil del alumno' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('foto'))
  subirFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.subirFoto(id, file);
  }

  @Delete(':id/foto')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar foto de perfil del alumno' })
  eliminarFoto(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.eliminarFoto(id);
  }

  // ── Importación Excel ──────────────────────────────────────────

  @Post('import')
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Importar alumnos desde Excel (.xlsx). Formato: CÓDIGO, DNI, AP. PATERNO, AP. MATERNO, NOMBRES, TURNO, AULA' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importar(@UploadedFile() file: Express.Multer.File) {
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    // Obtener mapa de aulas (nombre|turno → id)
    const aulaMap = await this.service.getAulaMap();

    function str(v: any) { return String(v ?? '').trim(); }

    function normalizeAula(s: string): string {
      s = s.toUpperCase();
      const m = s.match(/^([A-Z])(\d{3})$/);
      return m ? `${m[1]}-${m[2]}` : s;
    }

    function normalizeTurno(s: string): 'manana' | 'tarde' {
      return s.toUpperCase().includes('TARDE') ? 'tarde' : 'manana';
    }

    const dtos: CreateAlumnoDto[] = rows.map((r) => {
      // Soporte para formato nuevo (CÓDIGO, AP. PATERNO…) y legado (Nombres, Apellidos, Email)
      const codigo    = str(r['CÓDIGO'] ?? r['CODIGO'] ?? r['Código'] ?? r['codigo'] ?? '').padStart(6, '0').slice(-6);
      const dni       = str(r['DNI'] ?? r['dni'] ?? '');
      const apPat     = str(r['AP. PATERNO'] ?? r['AP.PATERNO'] ?? r['ApPaterno'] ?? '');
      const apMat     = str(r['AP. MATERNO'] ?? r['AP.MATERNO'] ?? r['ApMaterno'] ?? '');
      const nombres   = str(r['NOMBRES'] ?? r['Nombres'] ?? r['nombres'] ?? '');
      const apellidos = apPat && apMat
        ? `${apPat} ${apMat}`
        : str(r['Apellidos'] ?? r['apellidos'] ?? `${apPat} ${apMat}`.trim());

      // Email: priorizar columna, luego generar desde código
      const email = str(r['Email'] ?? r['email'] ?? r['Correo'] ?? '') || `${codigo}@academia.edu`;

      // Aula
      const aulaNom  = normalizeAula(str(r['AULA'] ?? r['Aula'] ?? r['aula'] ?? ''));
      const turno    = normalizeTurno(str(r['TURNO'] ?? r['Turno'] ?? r['turno'] ?? ''));
      const aulaKey  = `${aulaNom.toLowerCase()}|${turno}`;
      const aula_id  = aulaMap.get(aulaKey) ?? undefined;

      return {
        dni,
        nombres,
        apellidos,
        email,
        password: dni.length >= 8 ? dni : 'Matricula2026',
        aula_id,
        fecha_nacimiento: r['Fecha_nacimiento'] ?? r['FechaNacimiento'] ?? undefined,
        telefono: r['Telefono'] ?? r['telefono'] ?? undefined,
      };
    });

    return this.service.importar(dtos);
  }

  // ── Importación por SEMESTRE (CSV oficial de matrícula) ────────
  @Post('import-semestre')
  @Roles(Rol.admin)
  @ApiOperation({
    summary:
      'Importar alumnos desde el CSV oficial de matrícula (formato semestre): ' +
      'crea/actualiza alumnos por DNI, auto-distribuye el aula por área+turno, ' +
      'usa el Código de Inscripción como código de barras, upserta la carrera, ' +
      'crea el apoderado (cuenta derivada del DNI del alumno) y registra la cuota.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importarSemestre(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se proporcionó archivo');
    const rows = parseSemestreCsv(file.buffer);
    if (!rows.length) {
      throw new BadRequestException('El CSV no contiene filas válidas (revisa el formato/columnas).');
    }
    return this.service.importarSemestre(rows);
  }

  // ── Carga masiva de fotos (ZIP) ────────────────────────────────
  @Post('import-fotos')
  @Roles(Rol.admin)
  @ApiOperation({
    summary:
      'Cargar fotos de alumnos desde un ZIP. Cada imagen se asocia por el DNI ' +
      'embebido en el nombre del archivo y se guarda en MinIO.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 300 * 1024 * 1024 } }))
  async importarFotos(@UploadedFile() file: Express.Multer.File) {
    return this.service.importarFotos(file);
  }
}
