import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AsistenciaService } from './asistencia.service';
import { RegisterScanDto } from './dto/register-scan.dto';
import { ManualCorrectionDto } from './dto/manual-correction.dto';
import { FilterAsistenciaDto } from './dto/filter-asistencia.dto';

@ApiTags('Asistencia')
@Controller('asistencia')
export class AsistenciaController {
  constructor(private readonly service: AsistenciaService) {}

  /**
   * POST /asistencia/scan
   * Público — usado desde la pantalla del vigilante (modo HID).
   */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar asistencia por escaneo de código de barras' })
  scan(@Body() dto: RegisterScanDto) {
    return this.service.scan(dto);
  }

  /**
   * GET /asistencia/stats
   * Estadísticas del día actual.
   */
  @Get('stats')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
  @ApiOperation({ summary: 'Estadísticas de asistencia del día actual' })
  stats() {
    return this.service.stats();
  }

  /**
   * GET /asistencia
   * Listado paginado con filtros.
   */
  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Listar asistencias paginadas con filtros' })
  findAll(@Query() dto: FilterAsistenciaDto) {
    return this.service.findAll(dto);
  }

  /**
   * GET /asistencia/alumno/:alumno_id
   * Últimas asistencias de un alumno.
   */
  @Get('alumno/:alumno_id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.admin, Rol.director, Rol.alumno)
  @ApiOperation({ summary: 'Obtener últimas asistencias de un alumno' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Máximo de registros (default 50)' })
  findByAlumno(
    @Param('alumno_id', ParseUUIDPipe) alumno_id: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findByAlumno(alumno_id, limit ? parseInt(limit, 10) : 50);
  }

  /**
   * PATCH /asistencia/:id
   * Corrección manual de un registro.
   */
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
}
