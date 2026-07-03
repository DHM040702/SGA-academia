import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AsistenciaService } from './asistencia.service';
import { RegisterScanDto } from './dto/register-scan.dto';
import { ManualCorrectionDto } from './dto/manual-correction.dto';
import { FilterAsistenciaDto } from './dto/filter-asistencia.dto';
import { CreateManualAsistenciaDto } from './dto/create-manual-asistencia.dto';
import { CerrarTurnoDto } from './dto/cerrar-turno.dto';
import { JustificarAusenciaDto } from './dto/justificar-ausencia.dto';
import { FilterInasistenciasDto } from './dto/filter-inasistencias.dto';

@ApiTags('Asistencia')
@Controller('asistencia')
export class AsistenciaController {
  constructor(private readonly service: AsistenciaService) {}

  /** POST /asistencia/scan — registro de asistencia del auxiliar (Bearer del auxiliar) */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Registrar asistencia por código de barras (modo HID)' })
  scan(@Body() dto: RegisterScanDto, @CurrentUser() user: { id: string }) {
    return this.service.scan(dto, user.id);
  }

  /** POST /asistencia/cerrar-turno — registrar ausencias masivas */
  @Post('cerrar-turno')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Cerrar turno: registrar ausencia para alumnos sin asistencia del día' })
  cerrarTurno(@Body() dto: CerrarTurnoDto, @CurrentUser() user: { id: string }) {
    return this.service.cerrarTurno(dto, user.id);
  }

  /** POST /asistencia/manual — registro manual de asistencia */
  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Registrar asistencia manualmente (sin código de barras)' })
  createManual(@Body() dto: CreateManualAsistenciaDto, @CurrentUser() user: { id: string }) {
    return this.service.createManual(dto, user.id);
  }

  /** GET /asistencia/stats?fecha=YYYY-MM-DD — estadísticas del día (por defecto hoy) */
  @Get('stats')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.auxiliar)
  @ApiOperation({ summary: 'Estadísticas de asistencia de una fecha (por defecto hoy)' })
  @ApiQuery({ name: 'fecha', required: false, type: String, example: '2026-06-03' })
  stats(@Query('fecha') fecha?: string) {
    return this.service.stats(fecha);
  }

  /** GET /asistencia/export-docentes?fecha=YYYY-MM-DD — datos para Excel de docentes */
  @Get('export-docentes')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Datos de asistencia de docentes enriquecidos con horario (para exportar a Excel)' })
  @ApiQuery({ name: 'fecha', required: true, type: String, example: '2026-06-03' })
  exportDocentes(@Query('fecha') fecha: string) {
    return this.service.exportDocentes(fecha);
  }

  /** GET /asistencia/inasistencias — panel de faltas por rango de fechas */
  @Get('inasistencias')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Listar inasistencias de alumnos por rango de fechas (para justificar)' })
  inasistencias(@Query() dto: FilterInasistenciasDto) {
    return this.service.inasistencias(dto);
  }

  /** GET /asistencia — listado paginado con filtros */
  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.auxiliar)
  @ApiOperation({ summary: 'Listar asistencias paginadas con filtros' })
  findAll(@Query() dto: FilterAsistenciaDto, @CurrentUser() user: { id: string; rol: string }) {
    return this.service.findAll(dto, user);
  }

  /** GET /asistencia/alumno/:id — últimas asistencias de un alumno */
  @Get('alumno/:alumnoId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.alumno, Rol.apoderado)
  @ApiOperation({ summary: 'Obtener últimas asistencias de un alumno' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByAlumno(
    @Param('alumnoId', ParseUUIDPipe) alumnoId: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: { id: string; rol: string },
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.service.findByAlumno(alumnoId, Math.min(parsedLimit, 200), user);
  }

  /** PATCH /asistencia/:id/tardanza — marcar puntual/tardanza (auxiliar en el kiosco) */
  @Patch(':id/tardanza')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Cambiar solo el flag puntual/tardanza de un registro' })
  setTardanza(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { es_tardanza: boolean },
    @CurrentUser() user: { id: string },
  ) {
    return this.service.setTardanza(id, !!dto.es_tardanza, user.id);
  }

  /** PATCH /asistencia/:id — corrección manual (solo admin y director) */
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Corrección manual de un registro de asistencia' })
  corregir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualCorrectionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.corregir(id, dto, user.id);
  }

  /** PATCH /asistencia/:id/justificar — agregar justificación a ausencia */
  @Patch(':id/justificar')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Agregar o actualizar justificación de una ausencia' })
  justificar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JustificarAusenciaDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.justificar(id, dto, user.id);
  }

  /** DELETE /asistencia/:id — eliminar registro (admin only) */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar registro de asistencia' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
