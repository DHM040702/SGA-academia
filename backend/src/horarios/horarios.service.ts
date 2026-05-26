import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { FilterHorariosDto } from './dto/filter-horarios.dto';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

function getTimeMinutes(dt: Date): number {
  return dt.getHours() * 60 + dt.getMinutes();
}

function formatTime(dt: Date): string {
  return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
}

@Injectable()
export class HorariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterHorariosDto) {
    const { page = 1, limit = 50, aula_id, docente_id, dia_semana } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (aula_id)   where.aulaId    = aula_id;
    if (docente_id) where.docenteId = docente_id;
    if (dia_semana !== undefined) where.diaSemana = dia_semana;

    const [items, total] = await Promise.all([
      this.prisma.horario.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
        include: {
          docente: { select: { id: true, nombre: true, apellidos: true, dni: true } },
          curso:   { select: { id: true, nombre: true, codigo: true } },
          aula: {
            select: {
              id: true, nombre: true,
              ciclo: { select: { id: true, nombre: true } },
            },
          },
        },
      }),
      this.prisma.horario.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const horario = await this.prisma.horario.findFirst({
      where: { id },
      include: {
        docente: { select: { id: true, nombre: true, apellidos: true, dni: true } },
        curso:   { select: { id: true, nombre: true, codigo: true } },
        aula: {
          select: {
            id: true, nombre: true,
            ciclo: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    if (!horario) throw new NotFoundException('Horario no encontrado');
    return horario;
  }

  async create(dto: CreateHorarioDto) {
    const conflictos = await this.detectarConflictos(dto);
    if (conflictos.length > 0) {
      throw new BadRequestException({ message: 'Conflictos de horario detectados', conflictos });
    }

    return this.prisma.horario.create({
      data: {
        docenteId:  dto.docente_id,
        cursoId:    dto.curso_id,
        aulaId:     dto.aula_id,
        diaSemana:  dto.dia_semana,
        horaInicio: timeStringToDate(dto.hora_inicio),
        horaFin:    timeStringToDate(dto.hora_fin),
      },
      include: {
        docente: { select: { id: true, nombre: true, apellidos: true } },
        curso:   { select: { id: true, nombre: true, codigo: true } },
        aula:    { select: { id: true, nombre: true } },
      },
    });
  }

  async update(id: string, dto: UpdateHorarioDto) {
    const existing = await this.findOne(id);

    const dtoCompleto: CreateHorarioDto = {
      docente_id:  dto.docente_id  ?? existing.docenteId,
      curso_id:    dto.curso_id    ?? existing.cursoId,
      aula_id:     dto.aula_id    ?? existing.aulaId,
      dia_semana:  dto.dia_semana  ?? existing.diaSemana,
      hora_inicio: dto.hora_inicio ?? formatTime(existing.horaInicio),
      hora_fin:    dto.hora_fin    ?? formatTime(existing.horaFin),
    };

    const conflictos = await this.detectarConflictos(dtoCompleto, id);
    if (conflictos.length > 0) {
      throw new BadRequestException({ message: 'Conflictos de horario detectados', conflictos });
    }

    return this.prisma.horario.update({
      where: { id },
      data: {
        ...(dto.docente_id  !== undefined && { docenteId:  dto.docente_id }),
        ...(dto.curso_id    !== undefined && { cursoId:    dto.curso_id }),
        ...(dto.aula_id     !== undefined && { aulaId:     dto.aula_id }),
        ...(dto.dia_semana  !== undefined && { diaSemana:  dto.dia_semana }),
        ...(dto.hora_inicio !== undefined && { horaInicio: timeStringToDate(dto.hora_inicio) }),
        ...(dto.hora_fin    !== undefined && { horaFin:    timeStringToDate(dto.hora_fin) }),
        ...(dto.publicado   !== undefined && { publicado:  dto.publicado }),
      },
      include: {
        docente: { select: { id: true, nombre: true, apellidos: true } },
        curso:   { select: { id: true, nombre: true, codigo: true } },
        aula:    { select: { id: true, nombre: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.horario.delete({ where: { id } });
    return { success: true };
  }

  async findConflictos() {
    const todos = await this.prisma.horario.findMany({
      include: {
        docente: { select: { id: true, nombre: true, apellidos: true } },
        curso:   { select: { id: true, nombre: true } },
        aula:    { select: { id: true, nombre: true } },
      },
    });

    const conflictivos: typeof todos = [];
    for (const h of todos) {
      const iA = getTimeMinutes(h.horaInicio);
      const fA = getTimeMinutes(h.horaFin);
      for (const h2 of todos) {
        if (h.id === h2.id) continue;
        if (h.diaSemana !== h2.diaSemana) continue;
        const iB = getTimeMinutes(h2.horaInicio);
        const fB = getTimeMinutes(h2.horaFin);
        if (!(iA < fB && fA > iB)) continue;
        const mismoDocente = h.docenteId === h2.docenteId;
        const mismaAula    = h.aulaId === h2.aulaId;
        if ((mismoDocente || mismaAula) && !conflictivos.find((c) => c.id === h.id)) {
          conflictivos.push(h);
          break;
        }
      }
    }
    return conflictivos;
  }

  private async detectarConflictos(dto: CreateHorarioDto, excludeId?: string) {
    const inicioNuevo = getTimeMinutes(timeStringToDate(dto.hora_inicio));
    const finNuevo    = getTimeMinutes(timeStringToDate(dto.hora_fin));
    if (inicioNuevo >= finNuevo) throw new BadRequestException('hora_inicio debe ser anterior a hora_fin');

    const where: any = { diaSemana: dto.dia_semana };
    if (excludeId) where.NOT = { id: excludeId };

    const horarios = await this.prisma.horario.findMany({
      where,
      include: {
        docente: { select: { nombre: true, apellidos: true } },
        curso:   { select: { nombre: true } },
        aula:    { select: { nombre: true } },
      },
    });

    const conflictos: { tipo: 'docente' | 'aula'; horario: typeof horarios[0] }[] = [];

    for (const h of horarios) {
      const iE = getTimeMinutes(h.horaInicio);
      const fE = getTimeMinutes(h.horaFin);
      if (!(inicioNuevo < fE && finNuevo > iE)) continue;

      if (h.docenteId === dto.docente_id) conflictos.push({ tipo: 'docente', horario: h });
      if (h.aulaId    === dto.aula_id)    conflictos.push({ tipo: 'aula',    horario: h });
    }

    return conflictos;
  }
}
