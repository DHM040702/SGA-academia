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
import { BibliotecaService } from './biblioteca.service';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { FilterBibliotecaDto } from './dto/filter-biblioteca.dto';

@ApiTags('Biblioteca')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('biblioteca')
export class BibliotecaController {
  constructor(private readonly service: BibliotecaService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Listar recursos de biblioteca con filtros' })
  findAll(@Query() dto: FilterBibliotecaDto) {
    return this.service.findAll(dto);
  }

  @Get('stats')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Estadísticas de la biblioteca digital' })
  stats() {
    return this.service.stats();
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.alumno, Rol.apoderado, Rol.vigilante)
  @ApiOperation({ summary: 'Detalle de un recurso de biblioteca' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin, Rol.director, Rol.docente)
  @ApiOperation({ summary: 'Subir / registrar un recurso en la biblioteca' })
  create(
    @Body() dto: CreateRecursoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Actualizar un recurso de biblioteca' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecursoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar un recurso de biblioteca (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
