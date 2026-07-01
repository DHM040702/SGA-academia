import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TurnosService, UpdateTurnoConfigDto } from './turnos.service';

@ApiTags('Turnos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('turnos')
export class TurnosController {
  constructor(private readonly service: TurnosService) {}

  @Get()
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Listar configuraciones de turno (mañana / tarde)' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':turno')
  @Roles(Rol.admin, Rol.director, Rol.auxiliar)
  @ApiOperation({ summary: 'Detalle de la configuración de un turno' })
  findOne(@Param('turno') turno: string) {
    return this.service.findOne(turno);
  }

  @Patch(':turno')
  @Roles(Rol.admin, Rol.director)
  @ApiOperation({ summary: 'Actualizar horarios de un turno' })
  update(@Param('turno') turno: string, @Body() dto: UpdateTurnoConfigDto) {
    return this.service.update(turno, dto);
  }
}
