import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Area, Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CarrerasService } from './carreras.service';
import { CreateCarreraDto } from './dto/create-carrera.dto';
import { UpdateCarreraDto } from './dto/update-carrera.dto';

@ApiTags('Carreras')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('carreras')
export class CarrerasController {
  constructor(private readonly service: CarrerasService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.auxiliar)
  @ApiOperation({ summary: 'Listar carreras (filtrable por área)' })
  @ApiQuery({ name: 'area', required: false, enum: Area })
  findAll(@Query('area') area?: Area) {
    return this.service.findAll(area);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.auxiliar)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Crear carrera' })
  create(@Body() dto: CreateCarreraDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Actualizar carrera' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCarreraDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar carrera' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
