import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Area } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CarrerasService } from './carreras.service';
import { CreateCarreraDto } from './dto/create-carrera.dto';
import { UpdateCarreraDto } from './dto/update-carrera.dto';

@ApiTags('Carreras')
@UseGuards(JwtAuthGuard)
@Controller('carreras')
export class CarrerasController {
  constructor(private readonly service: CarrerasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar carreras (filtrable por área)' })
  @ApiQuery({ name: 'area', required: false, enum: Area })
  findAll(@Query('area') area?: Area) {
    return this.service.findAll(area);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCarreraDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCarreraDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
