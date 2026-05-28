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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ComunicadosService } from './comunicados.service';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';
import { UpdateComunicadoDto } from './dto/update-comunicado.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Comunicados')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('comunicados')
export class ComunicadosController {
  constructor(private readonly service: ComunicadosService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Listar comunicados paginados' })
  findAll(@Query() dto: PaginationDto, @CurrentUser() user: { id: string; rol: string }) {
    return this.service.findAll(dto, user.rol);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Detalle de un comunicado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
  @ApiOperation({ summary: 'Crear comunicado y enviar a roles destino' })
  create(@Body() dto: CreateComunicadoDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Actualizar comunicado (solo título y contenido)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComunicadoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar comunicado (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/leer')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Marcar comunicado como leído por el usuario actual' })
  marcarLeido(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.marcarLeido(id, user.id);
  }
}
