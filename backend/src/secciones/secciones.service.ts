import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAulaDto } from './dto/create-seccion.dto';
import { UpdateAulaDto } from './dto/update-seccion.dto';

@Injectable()
export class SeccionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(ciclo_id?: string) {
    // Si no se pide un ciclo explícito, limitar al SEMESTRE ACTIVO. Así las aulas
    // de semestres cerrados no aparecen en los listados/desplegables del activo
    // (horarios, asistencia, comunicados…). Solo si no hay ciclo activo se
    // muestran todas (estado legado).
    let cicloId = ciclo_id;
    if (!cicloId) {
      const activo = await this.prisma.ciclo.findFirst({
        where: { activo: true },
        select: { id: true },
      });
      cicloId = activo?.id;
    }

    return this.prisma.aula.findMany({
      where: cicloId ? { cicloId } : undefined,
      orderBy: [{ ciclo: { fechaInicio: 'desc' } }, { area: 'asc' }, { turno: 'asc' }, { nombre: 'asc' }],
      include: {
        ciclo: { select: { id: true, nombre: true, activo: true } },
        _count: { select: { alumnos: true, horarios: true } },
      },
    });
  }

  async findOne(id: string) {
    const aula = await this.prisma.aula.findFirst({
      where: { id },
      include: {
        ciclo: { select: { id: true, nombre: true, activo: true, fechaInicio: true, fechaFin: true } },
        alumnos: {
          where: { deletedAt: null },
          orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
          include: { usuario: { select: { email: true, activo: true } } },
        },
        horarios: {
          include: {
            docente: { select: { id: true, nombre: true, apellidos: true } },
            curso:   { select: { id: true, nombre: true, codigo: true } },
          },
          orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
        },
      },
    });

    if (!aula) throw new NotFoundException('Aula no encontrada');
    return aula;
  }

  async create(dto: CreateAulaDto) {
    const ciclo = await this.prisma.ciclo.findFirst({ where: { id: dto.ciclo_id } });
    if (!ciclo) throw new BadRequestException('El ciclo especificado no existe');

    // Unicidad: no puede haber dos aulas con el mismo nombre+turno en el mismo
    // ciclo (rompería el mapeo del import de alumnos, que indexa por nombre|turno).
    const dup = await this.prisma.aula.findFirst({
      where: { cicloId: dto.ciclo_id, nombre: dto.nombre, turno: dto.turno },
    });
    if (dup) throw new BadRequestException('Ya existe un aula con ese nombre y turno en el ciclo');

    return this.prisma.aula.create({
      data: {
        nombre:     dto.nombre,
        cicloId:    dto.ciclo_id,
        turno:      dto.turno,
        area:       dto.area,
        cupoMaximo: dto.cupo_maximo,
      },
      include: { ciclo: { select: { id: true, nombre: true } } },
    });
  }

  async update(id: string, dto: UpdateAulaDto) {
    const aula = await this.findOne(id);

    if (dto.ciclo_id) {
      const ciclo = await this.prisma.ciclo.findFirst({ where: { id: dto.ciclo_id } });
      if (!ciclo) throw new BadRequestException('El ciclo especificado no existe');
    }

    // Verificar unicidad con los valores EFECTIVOS tras el cambio.
    const cicloId = dto.ciclo_id ?? aula.cicloId;
    const nombre  = dto.nombre   ?? aula.nombre;
    const turno   = dto.turno    ?? aula.turno;
    const dup = await this.prisma.aula.findFirst({
      where: { cicloId, nombre, turno, NOT: { id } },
    });
    if (dup) throw new BadRequestException('Ya existe un aula con ese nombre y turno en el ciclo');

    return this.prisma.aula.update({
      where: { id },
      data: {
        ...(dto.nombre      !== undefined && { nombre:     dto.nombre }),
        ...(dto.ciclo_id    !== undefined && { cicloId:    dto.ciclo_id }),
        ...(dto.turno       !== undefined && { turno:      dto.turno }),
        ...(dto.area        !== undefined && { area:       dto.area }),
        ...(dto.cupo_maximo !== undefined && { cupoMaximo: dto.cupo_maximo }),
      },
      include: { ciclo: { select: { id: true, nombre: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const alumnos = await this.prisma.alumno.count({ where: { aulaId: id, deletedAt: null } });
    if (alumnos > 0) throw new BadRequestException('No se puede eliminar un aula con alumnos');
    await this.prisma.aula.delete({ where: { id } });
    return { success: true };
  }
}
