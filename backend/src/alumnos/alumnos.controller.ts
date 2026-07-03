import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AlumnosService } from './alumnos.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { UpdateAlumnoDto } from './dto/update-alumno.dto';
import { FilterAlumnosDto } from './dto/filter-alumnos.dto';
import { VincularApoderadoDto } from './dto/vincular-apoderado.dto';

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
}
