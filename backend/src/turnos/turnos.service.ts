import { Injectable, NotFoundException } from '@nestjs/common';
import { Turno } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTurnoConfigDto } from './dto/update-turno-config.dto';

export { UpdateTurnoConfigDto };

function parseTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

@Injectable()
export class TurnosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.turnoConfig.findMany({ orderBy: { turno: 'asc' } });
  }

  async findOne(turno: string) {
    const config = await this.prisma.turnoConfig.findUnique({
      where: { turno: turno as Turno },
    });
    if (!config) throw new NotFoundException(`Configuración de turno "${turno}" no encontrada`);
    return config;
  }

  async update(turno: string, dto: UpdateTurnoConfigDto) {
    await this.findOne(turno);

    const data: Record<string, unknown> = {};
    if (dto.hora_entrada        !== undefined) data.horaEntrada       = parseTime(dto.hora_entrada);
    if (dto.hora_limite_puntual !== undefined) data.horaLimitePuntual = parseTime(dto.hora_limite_puntual);
    if (dto.hora_fin            !== undefined) data.horaFin           = parseTime(dto.hora_fin);
    if (dto.activo              !== undefined) data.activo             = dto.activo;

    return this.prisma.turnoConfig.update({
      where: { turno: turno as Turno },
      data,
    });
  }
}
