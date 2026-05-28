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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DocentesService } from './docentes.service';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { FilterDocentesDto } from './dto/filter-docentes.dto';

@ApiTags('Docentes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('docentes')
export class DocentesController {
  constructor(private readonly service: DocentesService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
  @ApiOperation({ summary: 'Listar docentes paginados con filtros' })
  findAll(@Query() dto: FilterDocentesDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @Roles(Rol.admin, Rol.director, Rol.vigilante)
  @ApiOperation({ summary: 'Detalle de un docente' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Crear docente' })
  create(@Body() dto: CreateDocenteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Actualizar docente' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocenteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar docente (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  // ── Foto de perfil ────────────────────────────────────────────

  @Post(':id/foto')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Subir / reemplazar foto de perfil del docente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('foto'))
  subirFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.subirFoto(id, file);
  }

  @Delete(':id/foto')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Eliminar foto de perfil del docente' })
  eliminarFoto(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.eliminarFoto(id);
  }
}
