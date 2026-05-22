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

@ApiTags('Asistencia')
@Controller('asistencia')
export class AsistenciaController {
  constructor(private readonly service: AsistenciaService) {}

  /** POST /asistencia/scan — kiosko vigilante (Bearer del vigilante) */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
  @ApiOperation({ summary: 'Registrar asistencia por código de barras (modo HID)' })
  scan(@Body() dto: RegisterScanDto, @CurrentUser() user: { id: string }) {
    return this.service.scan(dto, user.id);
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

  /** GET /asistencia/stats — estadísticas del día */
  @Get('stats')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
  @ApiOperation({ summary: 'Estadísticas de asistencia del día actual' })
  stats() {
    return this.service.stats();
  }

  /** GET /asistencia — listado paginado con filtros */
  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Listar asistencias paginadas con filtros' })
  findAll(@Query() dto: FilterAsistenciaDto) {
    return this.service.findAll(dto);
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
  ) {
    return this.service.findByAlumno(alumnoId, limit ? parseInt(limit, 10) : 50);
  }

  /** PATCH /asistencia/:id — corrección manual */
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
