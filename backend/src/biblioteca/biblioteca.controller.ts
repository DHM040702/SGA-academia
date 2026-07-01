import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BibliotecaService } from './biblioteca.service';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { FilterBibliotecaDto } from './dto/filter-biblioteca.dto';

const PDF_INTERCEPTOR = FileInterceptor('file', {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  },
});

@ApiTags('Biblioteca')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('biblioteca')
export class BibliotecaController {
  constructor(private readonly service: BibliotecaService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.auxiliar)
  @ApiOperation({ summary: 'Listar recursos de biblioteca con filtros' })
  findAll(@Query() dto: FilterBibliotecaDto) {
    return this.service.findAll(dto);
  }

  @Get('stats')
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado)
  @ApiOperation({ summary: 'Estadísticas de la biblioteca digital' })
  stats(@Query() dto: FilterBibliotecaDto) {
    return this.service.stats({ area: dto.area, solo_generales: dto.solo_generales });
  }

  @Get(':id/historial')
  @Roles(Rol.admin, Rol.director, Rol.docente)
  @ApiOperation({ summary: 'Historial de ediciones de un recurso' })
  historial(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.historial(id);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.docente, Rol.alumno, Rol.apoderado, Rol.auxiliar)
  @ApiOperation({ summary: 'Detalle de un recurso de biblioteca' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin, Rol.director, Rol.docente)
  @ApiOperation({ summary: 'Crear recurso — multipart/form-data (PDF) o JSON (otros tipos)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(PDF_INTERCEPTOR)
  create(
    @Body() dto: CreateRecursoDto,
    @CurrentUser() user: { id: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(dto, user.id, file);
  }

  @Patch(':id')
  @Roles(Rol.admin, Rol.director, Rol.docente)
  @ApiOperation({ summary: 'Editar recurso (docente: solo propios). Guarda auditoría.' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(PDF_INTERCEPTOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecursoDto,
    @CurrentUser() caller: { id: string; rol: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, caller, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar recurso (soft delete + borra PDF de MinIO)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
