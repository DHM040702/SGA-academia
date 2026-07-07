import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SalidasService } from './salidas.service';
import { CreateSalidaDto } from './dto/create-salida.dto';
import { FilterSalidasDto } from './dto/filter-salidas.dto';

@ApiTags('Salidas adelantadas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salidas')
export class SalidasController {
  constructor(private readonly service: SalidasService) {}

  @Post()
  @Roles(Rol.admin, Rol.auxiliar)
  @ApiOperation({ summary: 'Registrar una salida adelantada de un alumno (admin o auxiliar)' })
  create(@Body() dto: CreateSalidaDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Listar salidas adelantadas (filtros por alumno y rango)' })
  findAll(@Query() dto: FilterSalidasDto) {
    return this.service.findAll(dto);
  }
}
