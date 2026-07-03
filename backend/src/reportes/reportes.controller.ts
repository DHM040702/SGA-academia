import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportesService } from './reportes.service';
import type {
  AsistenciaGeneralParams,
  ReporteAlumnosParams,
  ReporteHorariosParams,
  ReporteCursosParams,
  ReporteJustificacionesParams,
  ReporteAsistenciaAlumnoParams,
  RangoCicloParams,
} from './reportes.service';

@ApiTags('Reportes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('asistencia')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'KPIs de asistencia + tendencia 30d + por aula + por docente' })
  @ApiQuery({ name: 'ciclo_id',  required: false })
  @ApiQuery({ name: 'aula_id',   required: false })
  @ApiQuery({ name: 'desde',     required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta',     required: false, description: 'YYYY-MM-DD' })
  asistenciaGeneral(@Query() params: AsistenciaGeneralParams) {
    return this.service.asistenciaGeneral(params);
  }

  @Get('alumnos')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Matrícula: totales, estado, por aula, por área, por carrera' })
  @ApiQuery({ name: 'ciclo_id', required: false })
  @ApiQuery({ name: 'aula_id',  required: false })
  @ApiQuery({ name: 'area',     required: false, description: 'ciencias | letras | medicas' })
  reporteAlumnos(@Query() params: ReporteAlumnosParams) {
    return this.service.reporteAlumnos(params);
  }

  @Get('horarios')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Cobertura de horarios: por docente, por aula y por día de semana' })
  @ApiQuery({ name: 'ciclo_id',       required: false })
  @ApiQuery({ name: 'aula_id',        required: false })
  @ApiQuery({ name: 'docente_id',     required: false })
  @ApiQuery({ name: 'solo_publicados', required: false, description: 'true | false' })
  reporteHorarios(@Query() params: ReporteHorariosParams) {
    return this.service.reporteHorarios(params);
  }

  @Get('cursos')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Uso de cursos: clases asignadas, aulas, docentes y horas' })
  @ApiQuery({ name: 'ciclo_id',   required: false })
  @ApiQuery({ name: 'con_horario', required: false, description: 'true | false (omitir = todos)' })
  reporteCursos(@Query() params: ReporteCursosParams) {
    return this.service.reporteCursos(params);
  }

  @Get('justificaciones')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Faltas justificadas vs pendientes por rango, con expediente y traza' })
  @ApiQuery({ name: 'ciclo_id', required: false })
  @ApiQuery({ name: 'aula_id',  required: false })
  @ApiQuery({ name: 'desde',    required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta',    required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'estado',   required: false, description: 'todas | pendientes | justificadas' })
  reporteJustificaciones(@Query() params: ReporteJustificacionesParams) {
    return this.service.reporteJustificaciones(params);
  }

  @Get('asistencia-alumno')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Detalle e histórico de asistencia de un alumno' })
  @ApiQuery({ name: 'alumno_id', required: true })
  @ApiQuery({ name: 'desde',     required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta',     required: false, description: 'YYYY-MM-DD' })
  reporteAsistenciaAlumno(@Query() params: ReporteAsistenciaAlumnoParams) {
    return this.service.reporteAsistenciaAlumno(params);
  }

  @Get('ranking-aulas')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: '% de asistencia por aula en un rango, ordenado' })
  @ApiQuery({ name: 'ciclo_id', required: false })
  @ApiQuery({ name: 'desde',    required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta',    required: false, description: 'YYYY-MM-DD' })
  rankingAulas(@Query() params: RangoCicloParams) {
    return this.service.rankingAulas(params);
  }

  @Get('resumen-diario')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Consolidado por día del rango (presentes/tardanzas/faltas/%)' })
  @ApiQuery({ name: 'ciclo_id', required: false })
  @ApiQuery({ name: 'desde',    required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'hasta',    required: false, description: 'YYYY-MM-DD' })
  resumenDiario(@Query() params: RangoCicloParams) {
    return this.service.resumenDiario(params);
  }
}
