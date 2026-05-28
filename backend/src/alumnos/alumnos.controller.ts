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
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
  @ApiOperation({ summary: 'Listar alumnos paginados con filtros' })
  findAll(@Query() dto: FilterAlumnosDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
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
  @ApiOperation({ summary: 'Importar alumnos desde Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importar(@UploadedFile() file: Express.Multer.File) {
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);

    // Mapea columnas del Excel → DTO
    const dtos: CreateAlumnoDto[] = rows.map((r) => ({
      dni: String(r['DNI'] ?? r['dni'] ?? '').trim(),
      nombres: String(r['Nombres'] ?? r['nombres'] ?? '').trim(),
      apellidos: String(r['Apellidos'] ?? r['apellidos'] ?? '').trim(),
      email: String(r['Email'] ?? r['email'] ?? r['Correo'] ?? '').trim(),
      password: String(r['DNI'] ?? r['dni'] ?? ''), // Contraseña inicial = DNI
      fecha_nacimiento: r['Fecha_nacimiento'] ?? r['FechaNacimiento'] ?? undefined,
      telefono: r['Telefono'] ?? r['telefono'] ?? undefined,
    }));

    return this.service.importar(dtos);
  }
}
