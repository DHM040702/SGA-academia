import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiaSemana } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { FilterHorariosDto } from './dto/filter-horarios.dto';

/**
 * Convierte una cadena "HH:mm" en un objeto DateTime de Prisma (Time).
 * Prisma almacena @db.Time como DateTime; usamos una fecha base arbitraria.
 */
function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
  return date;
}

/** Extrae horas y minutos de un DateTime almacenado como Time */
function getTimeMinutes(dt: Date): number {
  return dt.getHours() * 60 + dt.getMinutes();
}

interface ConflictoDetectado {
  tipo: 'docente' | 'aula';
  horario_conflictivo: {
    id: string;
    dia_semana: string;
    hora_inicio: Date;
    hora_fin: Date;
    docente: { nombres: string; apellidos: string } | null;
    curso: { nombre: string } | null;
    seccion: { nombre: string; aula: string | null } | null;
  };
}

@Injectable()
export class HorariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(dto: FilterHorariosDto) {
    const { page = 1, limit = 20, seccion_id, docente_id, dia_semana } = dto;
    const skip = (page - 1) * limit;

    const where = {
      deleted_at: null,
      ...(seccion_id ? { seccion_id } : {}),
      ...(docente_id ? { docente_id } : {}),
      ...(dia_semana ? { dia_semana } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.horario.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
        include: {
          docente: { select: { id: true, nombres: true, apellidos: true, dni: true } },
          curso: { select: { id: true, nombre: true, codigo: true } },
          seccion: {
            select: {
              id: true,
              nombre: true,
              aula: true,
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
      where: { id, deleted_at: null },
      include: {
        docente: { select: { id: true, nombres: true, apellidos: true, dni: true } },
        curso: { select: { id: true, nombre: true, codigo: true } },
        seccion: {
          select: {
            id: true,
            nombre: true,
            aula: true,
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
      throw new BadRequestException({
        message: 'Se detectaron conflictos de horario',
        conflictos,
      });
    }

    return this.prisma.horario.create({
      data: {
        docente_id: dto.docente_id,
        curso_id: dto.curso_id,
        seccion_id: dto.seccion_id,
        dia_semana: dto.dia_semana,
        hora_inicio: timeStringToDate(dto.hora_inicio),
        hora_fin: timeStringToDate(dto.hora_fin),
      },
      include: {
        docente: { select: { id: true, nombres: true, apellidos: true } },
        curso: { select: { id: true, nombre: true, codigo: true } },
        seccion: { select: { id: true, nombre: true, aula: true } },
      },
    });
  }

  async update(id: string, dto: UpdateHorarioDto) {
    const existing = await this.findOne(id);

    // Construir DTO completo para la verificación de conflictos
    const dtoParaVerificar: CreateHorarioDto = {
      docente_id: dto.docente_id ?? existing.docente_id,
      curso_id: dto.curso_id ?? existing.curso_id,
      seccion_id: dto.seccion_id ?? existing.seccion_id,
      dia_semana: dto.dia_semana ?? existing.dia_semana,
      hora_inicio: dto.hora_inicio ?? formatTime(existing.hora_inicio),
      hora_fin: dto.hora_fin ?? formatTime(existing.hora_fin),
    };

    const conflictos = await this.detectarConflictos(dtoParaVerificar, id);
    if (conflictos.length > 0) {
      throw new BadRequestException({
        message: 'Se detectaron conflictos de horario',
        conflictos,
      });
    }

    return this.prisma.horario.update({
      where: { id },
      data: {
        ...(dto.docente_id !== undefined && { docente_id: dto.docente_id }),
        ...(dto.curso_id !== undefined && { curso_id: dto.curso_id }),
        ...(dto.seccion_id !== undefined && { seccion_id: dto.seccion_id }),
        ...(dto.dia_semana !== undefined && { dia_semana: dto.dia_semana }),
        ...(dto.hora_inicio !== undefined && { hora_inicio: timeStringToDate(dto.hora_inicio) }),
        ...(dto.hora_fin !== undefined && { hora_fin: timeStringToDate(dto.hora_fin) }),
      },
      include: {
        docente: { select: { id: true, nombres: true, apellidos: true } },
        curso: { select: { id: true, nombre: true, codigo: true } },
        seccion: { select: { id: true, nombre: true, aula: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.horario.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { success: true };
  }

  /**
   * Devuelve todos los horarios activos que tienen conflicto con al menos
   * otro horario (mismo docente o misma aula + mismo día + solapamiento de horas).
   */
  async findConflictos() {
    const todos = await this.prisma.horario.findMany({
      where: { deleted_at: null },
      include: {
        docente: { select: { id: true, nombres: true, apellidos: true } },
        curso: { select: { id: true, nombre: true, codigo: true } },
        seccion: { select: { id: true, nombre: true, aula: true } },
      },
    });

    const conflictivos: typeof todos = [];

    for (const h of todos) {
      const inicioA = getTimeMinutes(h.hora_inicio);
      const finA = getTimeMinutes(h.hora_fin);

      for (const h2 of todos) {
        if (h.id === h2.id) continue;
        if (h.dia_semana !== h2.dia_semana) continue;

        const inicioB = getTimeMinutes(h2.hora_inicio);
        const finB = getTimeMinutes(h2.hora_fin);
        const seSuperponen = inicioA < finB && finA > inicioB;
        if (!seSuperponen) continue;

        const mismoDocente = h.docente_id === h2.docente_id;
        const mismaAula =
          h.seccion.aula !== null &&
          h2.seccion.aula !== null &&
          h.seccion.aula === h2.seccion.aula;

        if (mismoDocente || mismaAula) {
          if (!conflictivos.find((c) => c.id === h.id)) {
            conflictivos.push(h);
          }
          break;
        }
      }
    }

    return conflictivos;
  }

  /**
   * Verifica si el horario propuesto genera conflictos.
   * Comprueba:
   *   1) Mismo docente + mismo día + superposición de horas
   *   2) Misma aula (de la sección) + mismo día + superposición de horas
   */
  private async detectarConflictos(
    dto: CreateHorarioDto,
    excludeId?: string,
  ): Promise<ConflictoDetectado[]> {
    if (!dto.hora_inicio || !dto.hora_fin) return [];

    const inicioNuevo = getTimeMinutes(timeStringToDate(dto.hora_inicio));
    const finNuevo = getTimeMinutes(timeStringToDate(dto.hora_fin));

    if (inicioNuevo >= finNuevo) {
      throw new BadRequestException('hora_inicio debe ser anterior a hora_fin');
    }

    // Obtener el aula de la sección
    const seccion = await this.prisma.seccion.findFirst({
      where: { id: dto.seccion_id, deleted_at: null },
      select: { aula: true },
    });

    const conflictos: ConflictoDetectado[] = [];

    // Horarios del mismo día sin el horario que se está editando
    const horariosDelDia = await this.prisma.horario.findMany({
      where: {
        dia_semana: dto.dia_semana,
        deleted_at: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      include: {
        docente: { select: { nombres: true, apellidos: true } },
        curso: { select: { nombre: true } },
        seccion: { select: { nombre: true, aula: true } },
      },
    });

    for (const h of horariosDelDia) {
      const inicioExistente = getTimeMinutes(h.hora_inicio);
      const finExistente = getTimeMinutes(h.hora_fin);
      const seSuperponen = inicioNuevo < finExistente && finNuevo > inicioExistente;

      if (!seSuperponen) continue;

      // Conflicto por docente
      if (h.docente_id === dto.docente_id) {
        conflictos.push({
          tipo: 'docente',
          horario_conflictivo: {
            id: h.id,
            dia_semana: h.dia_semana,
            hora_inicio: h.hora_inicio,
            hora_fin: h.hora_fin,
            docente: h.docente,
            curso: h.curso,
            seccion: h.seccion,
          },
        });
      }

      // Conflicto por aula
      if (
        seccion?.aula &&
        h.seccion.aula &&
        seccion.aula === h.seccion.aula
      ) {
        conflictos.push({
          tipo: 'aula',
          horario_conflictivo: {
            id: h.id,
            dia_semana: h.dia_semana,
            hora_inicio: h.hora_inicio,
            hora_fin: h.hora_fin,
            docente: h.docente,
            curso: h.curso,
            seccion: h.seccion,
          },
        });
      }
    }

    return conflictos;
  }
}

/** Formatea un DateTime (almacenado como Time) a cadena HH:mm */
function formatTime(dt: Date): string {
  const h = dt.getHours().toString().padStart(2, '0');
  const m = dt.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
