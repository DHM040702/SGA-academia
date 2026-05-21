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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SeccionesService } from './secciones.service';
import { CreateAulaDto } from './dto/create-seccion.dto';
import { UpdateAulaDto } from './dto/update-seccion.dto';

@ApiTags('Aulas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aulas')
export class SeccionesController {
  constructor(private readonly service: SeccionesService) {}

  @Get()
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Listar aulas, opcionalmente filtradas por ciclo' })
  @ApiQuery({ name: 'ciclo_id', required: false, type: String, description: 'UUID del ciclo' })
  findAll(@Query('ciclo_id') ciclo_id?: string) {
    return this.service.findAll(ciclo_id);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Detalle de un aula con alumnos y horarios' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Crear aula' })
  create(@Body() dto: CreateAulaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Actualizar aula' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAulaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar aula' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
