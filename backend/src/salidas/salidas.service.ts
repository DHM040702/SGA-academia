import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateSalidaDto } from './dto/create-salida.dto';
import { FilterSalidasDto } from './dto/filter-salidas.dto';

/**
 * Salidas adelantadas de alumnos. La tabla `salidas_adelantadas` se gestiona con
 * SQL crudo (fuera de schema.prisma), igual que refresh_tokens.
 */
@Injectable()
export class SalidasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSalidaDto, autorizadoPorId: string) {
    const alumno = await this.prisma.alumno.findFirst({
      where: { id: dto.alumno_id, deletedAt: null },
      select: { id: true },
    });
    if (!alumno) throw new NotFoundException('Alumno no encontrado');

    const rows = await this.prisma.$queryRaw<
      { id: string; fecha: Date; motivo: string }[]
    >`
      INSERT INTO salidas_adelantadas (alumno_id, motivo, autorizado_por)
      VALUES (${dto.alumno_id}::uuid, ${dto.motivo}, ${autorizadoPorId}::uuid)
      RETURNING id, fecha, motivo
    `;
    return { ...rows[0], success: true };
  }

  async findAll(dto: FilterSalidasDto) {
    const { page = 1, limit = 20, alumno_id, desde, hasta } = dto as any;
    const skip = (page - 1) * limit;

    const conds: Prisma.Sql[] = [];
    if (alumno_id) conds.push(Prisma.sql`s.alumno_id = ${alumno_id}::uuid`);
    if (desde)     conds.push(Prisma.sql`s.fecha >= ${`${desde}T00:00:00`}::timestamptz`);
    if (hasta)     conds.push(Prisma.sql`s.fecha <= ${`${hasta}T23:59:59`}::timestamptz`);
    const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;

    const data = await this.prisma.$queryRaw<any[]>`
      SELECT s.id, s.motivo, s.fecha,
             a.nombre  AS "alumnoNombre", a.apellidos AS "alumnoApellidos",
             a.codigo_barras AS "codigo", a.dni AS "dni",
             au.nombre AS "aula",
             u.nombre  AS "autorNombre", u.apellidos AS "autorApellidos", u.rol AS "autorRol"
      FROM salidas_adelantadas s
      JOIN alumnos  a  ON a.id = s.alumno_id
      LEFT JOIN aulas au ON au.id = a.aula_id
      JOIN usuarios u  ON u.id = s.autorizado_por
      ${where}
      ORDER BY s.fecha DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalRows = await this.prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM salidas_adelantadas s ${where}
    `;
    const total = totalRows[0]?.n ?? 0;

    const items = data.map((r) => ({
      id:              r.id,
      fecha:           r.fecha,
      motivo:          r.motivo,
      alumno:          `${r.alumnoApellidos ?? ''} ${r.alumnoNombre ?? ''}`.trim(),
      codigo:          r.codigo ?? '',
      dni:             r.dni ?? '',
      aula:            r.aula ?? '',
      autorizado_por:  `${r.autorNombre ?? ''} ${r.autorApellidos ?? ''}`.trim() || r.autorRol,
    }));

    return paginate(items, total, page, limit);
  }
}
