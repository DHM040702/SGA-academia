import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportesService } from './reportes.service';
import type { AsistenciaGeneralParams } from './reportes.service';

@ApiTags('Reportes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('asistencia')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Reporte de asistencia general (KPIs + por sección + por docente + tendencia 30d)' })
  asistenciaGeneral(@Query() params: AsistenciaGeneralParams) {
    return this.service.asistenciaGeneral(params);
  }
}
