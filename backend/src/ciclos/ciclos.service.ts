import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCicloDto } from './dto/create-ciclo.dto';
import { UpdateCicloDto } from './dto/update-ciclo.dto';

/** Meses sin enseñar tras los que un docente se desactiva automáticamente. */
const MESES_INACTIVIDAD_DOCENTE = 6;

@Injectable()
export class CiclosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ajusta el estado de las cuentas de docentes al activar un ciclo. NO borra ni
   * oculta docentes (sus registros persisten y siguen en la lista); solo cambia
   * el flag `usuario.activo`:
   *  - Reactiva a los desactivados que vuelven a tener horario en el ciclo activo.
   *  - Desactiva a los que llevan ≥ MESES_INACTIVIDAD_DOCENTE sin enseñar, es
   *    decir: sin horario en el ciclo activo Y sin ninguna asistencia en ese
   *    periodo (se respeta una antigüedad mínima para no tocar altas recientes).
   */
  private async ajustarEstadoDocentes(tx: Prisma.TransactionClient, cicloActivoId: string) {
    const limite = new Date();
    limite.setMonth(limite.getMonth() - MESES_INACTIVIDAD_DOCENTE);

    // Reactivar: vuelve a tener horario en el ciclo recién activado.
    const reactivar = await tx.docente.findMany({
      where: {
        deletedAt: null,
        usuario:   { activo: false },
        horarios:  { some: { aula: { cicloId: cicloActivoId } } },
      },
      select: { usuarioId: true },
    });
    if (reactivar.length) {
      await tx.usuario.updateMany({
        where: { id: { in: reactivar.map((d) => d.usuarioId) } },
        data:  { activo: true },
      });
    }

    // Desactivar: activo, con antigüedad > umbral, sin horario en el ciclo activo
    // y sin asistencia en los últimos meses (no está enseñando).
    const desactivar = await tx.docente.findMany({
      where: {
        deletedAt:   null,
        usuario:     { activo: true },
        createdAt:   { lt: limite },
        horarios:    { none: { aula: { cicloId: cicloActivoId } } },
        asistencias: { none: { fecha: { gte: limite } } },
      },
      select: { usuarioId: true },
    });
    if (desactivar.length) {
      await tx.usuario.updateMany({
        where: { id: { in: desactivar.map((d) => d.usuarioId) } },
        data:  { activo: false },
      });
    }

    return { reactivados: reactivar.length, desactivados: desactivar.length };
  }

  async findAll() {
    const ciclos = await this.prisma.ciclo.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        _count: { select: { aulas: true } },
        aulas: {
          select: { _count: { select: { alumnos: true } } },
        },
      },
    });

    return ciclos.map((c) => {
      const total_alumnos = c.aulas.reduce((sum, a) => sum + a._count.alumnos, 0);
      const { aulas, ...rest } = c;
      return { ...rest, total_secciones: c._count.aulas, total_alumnos };
    });
  }

  async findOne(id: string) {
    const ciclo = await this.prisma.ciclo.findFirst({
      where: { id },
      include: {
        aulas: {
          include: {
            alumnos: {
              where: { deletedAt: null },
              include: { usuario: { select: { email: true, activo: true } } },
            },
            horarios: {
              include: {
                docente: { select: { id: true, nombre: true, apellidos: true } },
                curso:   { select: { id: true, nombre: true, codigo: true } },
              },
            },
          },
        },
      },
    });

    if (!ciclo) throw new NotFoundException('Ciclo no encontrado');
    return ciclo;
  }

  async create(dto: CreateCicloDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.activo) {
        await tx.ciclo.updateMany({ where: { activo: true }, data: { activo: false } });
      }
      const ciclo = await tx.ciclo.create({
        data: {
          nombre:      dto.nombre,
          fechaInicio: new Date(dto.fecha_inicio),
          fechaFin:    new Date(dto.fecha_fin),
          activo:      dto.activo ?? false,
        },
      });
      const docentes = dto.activo ? await this.ajustarEstadoDocentes(tx, ciclo.id) : null;
      return { ...ciclo, docentes_ajuste: docentes };
    });
  }

  async update(id: string, dto: UpdateCicloDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.activo === true) {
        await tx.ciclo.updateMany({ where: { activo: true, NOT: { id } }, data: { activo: false } });
      } else if (dto.activo === false) {
        // Evitar quedarse sin NINGÚN ciclo activo (rompería el scoping por ciclo).
        const actual = await tx.ciclo.findUnique({ where: { id }, select: { activo: true } });
        if (actual?.activo) {
          throw new BadRequestException('No puedes desactivar el ciclo activo. Activa otro ciclo para reemplazarlo.');
        }
      }
      const ciclo = await tx.ciclo.update({
        where: { id },
        data: {
          ...(dto.nombre        !== undefined && { nombre:      dto.nombre }),
          ...(dto.fecha_inicio  !== undefined && { fechaInicio: new Date(dto.fecha_inicio) }),
          ...(dto.fecha_fin     !== undefined && { fechaFin:    new Date(dto.fecha_fin) }),
          ...(dto.activo        !== undefined && { activo:      dto.activo }),
        },
      });
      // Al activar este ciclo, recalcular qué docentes siguen activos.
      const docentes = dto.activo === true ? await this.ajustarEstadoDocentes(tx, id) : null;
      return { ...ciclo, docentes_ajuste: docentes };
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const totalAlumnos = await this.prisma.alumno.count({
      where: { aula: { cicloId: id }, deletedAt: null },
    });
    if (totalAlumnos > 0) {
      throw new BadRequestException('No se puede eliminar un ciclo con alumnos matriculados');
    }
    await this.prisma.ciclo.delete({ where: { id } });
    return { success: true };
  }
}
