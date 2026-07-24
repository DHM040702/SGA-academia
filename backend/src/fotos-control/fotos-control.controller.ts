import {
  Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FotosControlService, type TipoPersona } from './fotos-control.service';

@ApiTags('Control de fotos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fotos-control')
export class FotosControlController {
  constructor(private readonly service: FotosControlService) {}

  @Get()
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({
    summary:
      'Control de fotos de alumnos y docentes: cobertura (con/sin foto) y ' +
      'fotos duplicadas (misma imagen asignada a varias personas, por ETag).',
  })
  control() {
    return this.service.control();
  }

  @Delete(':tipo/:id/foto')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.admin)
  @ApiOperation({ summary: 'Quitar la foto de un alumno o docente (deshacer duplicado)' })
  eliminarFoto(
    @Param('tipo') tipo: TipoPersona,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.eliminarFoto(tipo, id);
  }
}
