import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { FilterHorariosDto } from './dto/filter-horarios.dto';

// Las horas se guardan y leen siempre en UTC, nunca en el timezone local del
// proceso Node. Así el valor no depende de TZ del servidor y coincide con
// cómo el frontend extrae la hora (toISOString().slice(11, 16)).
function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

function getTimeMinutes(dt: Date): number {
  return dt.getUTCHours() * 60 + dt.getUTCMinutes();
}

function formatTime(dt: Date): string {
  return `${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`;
}

@Injectable()
export class HorariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterHorariosDto) {
    const { page = 1, limit = 50, ciclo_id, aula_id, docente_id, dia_semana, publicado } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (aula_id)             where.aulaId    = aula_id;
    if (docente_id)          where.docenteId = docente_id;
    if (dia_semana !== undefined) where.diaSemana = dia_semana;
    if (publicado !== undefined)  where.publicado  = publicado;

    // Scoping por ciclo: explícito si se pide; si no se pide ciclo ni aula
    // concreta, se limita al SEMESTRE ACTIVO (los horarios de semestres cerrados
    // no deben aparecer en el activo).
    if (ciclo_id) {
      where.aula = { cicloId: ciclo_id };
    } else if (!aula_id) {
      const activo = await this.prisma.ciclo.findFirst({
        where: { activo: true },
        select: { id: true },
      });
      if (activo) where.aula = { cicloId: activo.id };
    }

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
    // Solo dentro del semestre activo: no tiene sentido reportar conflictos
    // entre horarios de semestres cerrados.
    const activo = await this.prisma.ciclo.findFirst({
      where: { activo: true },
      select: { id: true },
    });

    const todos = await this.prisma.horario.findMany({
      where: activo ? { aula: { cicloId: activo.id } } : undefined,
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

    // Bloqueo: la clase no puede solaparse con el receso del aula ese día.
    try {
      const receso = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM recesos
        WHERE aula_id = ${dto.aula_id}::uuid
          AND dia_semana = ${dto.dia_semana}
          AND hora_inicio < ${dto.hora_fin}::time
          AND hora_fin    > ${dto.hora_inicio}::time
        LIMIT 1`;
      if (receso.length > 0) {
        throw new BadRequestException('La clase se solapa con el receso de esa aula ese día');
      }
    } catch (e) {
      // Si es el error de validación, propagarlo; si la tabla recesos aún no
      // existe en este servidor, ignorar el chequeo.
      if (e instanceof BadRequestException) throw e;
    }

    // Solo comparar dentro del MISMO ciclo que el aula del horario nuevo. Así un
    // docente que dicta a la misma hora en el semestre nuevo no choca falsamente
    // con su horario de un semestre cerrado.
    const aulaNueva = await this.prisma.aula.findUnique({
      where: { id: dto.aula_id },
      select: { cicloId: true },
    });

    const where: any = { diaSemana: dto.dia_semana };
    if (aulaNueva) where.aula = { cicloId: aulaNueva.cicloId };
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
