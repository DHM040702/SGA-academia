import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FotosControlService } from './fotos-control.service';

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
}
