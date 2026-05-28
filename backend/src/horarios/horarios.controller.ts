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
import { HorariosService } from './horarios.service';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { FilterHorariosDto } from './dto/filter-horarios.dto';

@ApiTags('Horarios')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('horarios')
export class HorariosController {
  constructor(private readonly service: HorariosService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Listar horarios paginados con filtros' })
  findAll(@Query() dto: FilterHorariosDto) {
    return this.service.findAll(dto);
  }

  @Get('conflictos')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Obtener todos los horarios que tienen conflictos detectados' })
  findConflictos() {
    return this.service.findConflictos();
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Detalle de un horario' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Crear horario (con detección de conflictos)' })
  create(@Body() dto: CreateHorarioDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Actualizar horario (con detección de conflictos)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHorarioDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar horario (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
