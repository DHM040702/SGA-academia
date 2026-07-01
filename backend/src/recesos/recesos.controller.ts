import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RecesosService } from './recesos.service';
import { CreateRecesoDto } from './dto/create-receso.dto';

@ApiTags('Recesos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recesos')
export class RecesosController {
  constructor(private readonly service: RecesosService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.auxiliar, Rol.docente, Rol.alumno)
  @ApiOperation({ summary: 'Listar recesos por aula o por ciclo (por defecto, el activo)' })
  @ApiQuery({ name: 'aula_id', required: false, type: String })
  @ApiQuery({ name: 'ciclo_id', required: false, type: String })
  findAll(@Query('aula_id') aulaId?: string, @Query('ciclo_id') cicloId?: string) {
    return this.service.findAll(aulaId, cicloId);
  }

  @Post()
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Crear o actualizar el receso de un aula en un día' })
  upsert(@Body() dto: CreateRecesoDto) {
    return this.service.upsert(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Eliminar un receso' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
