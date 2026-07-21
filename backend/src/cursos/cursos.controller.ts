import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CursosService } from './cursos.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';

@ApiTags('Cursos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cursos')
export class CursosController {
  constructor(private readonly service: CursosService) {}

  @Get()
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Listar todos los cursos con conteo de horarios' })
  findAll(@Query('q') q?: string, @Query('ciclo_id') cicloId?: string) {
    return this.service.findAll(q, cicloId);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Detalle de un curso con sus horarios asignados' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Crear curso' })
  create(@Body() dto: CreateCursoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Actualizar curso' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCursoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar curso (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
