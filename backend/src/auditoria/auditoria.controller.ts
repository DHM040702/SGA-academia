import { Controller, Delete, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditoriaService } from './auditoria.service';
import { FilterAuditoriaDto } from './dto/filter-auditoria.dto';

@ApiTags('Auditoría')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin, Rol.director)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos de auditoría con filtros (admin y director)' })
  findAll(@Query() dto: FilterAuditoriaDto) {
    return this.service.findAll(dto);
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Métricas de resumen para el panel de auditoría' })
  resumen() {
    return this.service.resumen();
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar el registro de auditoría filtrado a CSV' })
  async export(@Query() dto: FilterAuditoriaDto, @Res() res: Response) {
    const csv = await this.service.exportarCsv(dto);
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-${fecha}.csv"`);
    // BOM para que Excel respete los acentos
    res.send('﻿' + csv);
  }

  @Delete()
  @Roles(Rol.admin) // sobrescribe el @Roles de la clase: SOLO admin puede purgar
  @ApiOperation({ summary: 'Purgar el registro de auditoría hasta una fecha (solo admin)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'YYYY-MM-DD (sin valor = todo hasta hoy)' })
  purgar(@Query('hasta') hasta?: string) {
    return this.service.purgar(hasta);
  }
}
