import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { FilterUsuariosDto } from './dto/filter-usuarios.dto';

@ApiTags('Usuarios')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del sistema (solo admin)' })
  findAll(@Query() dto: FilterUsuariosDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario del sistema' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar email, contraseña, rol o estado de un usuario' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar (soft-delete) un usuario' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.remove(id, user.id);
  }

  @Get(':id/alumnos')
  @ApiOperation({ summary: 'Alumnos vinculados a un usuario apoderado' })
  getAlumnosByApoderado(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getAlumnosByApoderado(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer la contraseña de un usuario a su DNI (solo admin)' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.resetPassword(id);
  }
}
