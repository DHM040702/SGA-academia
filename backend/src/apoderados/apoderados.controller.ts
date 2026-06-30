import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApoderadosService } from './apoderados.service';
import { FilterApoderadosDto } from './dto/filter-apoderados.dto';
import { UpdateApoderadoDto } from './dto/update-apoderado.dto';

@ApiTags('Apoderados')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('apoderados')
export class ApoderadosController {
  constructor(private readonly service: ApoderadosService) {}

  @Get()
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Listar apoderados (con búsqueda y conteo de hijos)' })
  findAll(@Query() dto: FilterApoderadosDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Detalle de un apoderado con sus hijos vinculados' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Actualizar datos del apoderado (nombre, apellidos, WhatsApp)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateApoderadoDto) {
    return this.service.update(id, dto);
  }
}
