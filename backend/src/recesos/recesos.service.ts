import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecesoDto } from './dto/create-receso.dto';

// La tabla `recesos` se gestiona con SQL crudo (igual que el historial de
// biblioteca), porque el cliente Prisma de este entorno no siempre se regenera.
export interface RecesoRow {
  id:          string;
  aula_id:     string;
  dia_semana:  number;
  hora_inicio: string;   // "HH:MM:SS"
  hora_fin:    string;   // "HH:MM:SS"
  aula_nombre?: string;
  turno?:      string;
  area?:       string;
}

@Injectable()
export class RecesosService {
  constructor(private prisma: PrismaService) {}

  /** Lista recesos por aula, o por ciclo (por defecto, el ciclo activo). */
  async findAll(aulaId?: string, cicloId?: string): Promise<RecesoRow[]> {
    try {
      if (aulaId) {
        return await this.prisma.$queryRaw<RecesoRow[]>`
          SELECT r.*, a.nombre AS aula_nombre, a.turno::text AS turno, a.area::text AS area
          FROM recesos r
          JOIN aulas a ON a.id = r.aula_id
          WHERE r.aula_id = ${aulaId}::uuid
          ORDER BY r.dia_semana`;
      }

      let cid = cicloId;
      if (!cid) {
        const activo = await this.prisma.ciclo.findFirst({
          where: { activo: true },
          select: { id: true },
        });
        cid = activo?.id;
      }
      if (!cid) return [];

      return await this.prisma.$queryRaw<RecesoRow[]>`
        SELECT r.*, a.nombre AS aula_nombre, a.turno::text AS turno, a.area::text AS area
        FROM recesos r
        JOIN aulas a ON a.id = r.aula_id
        WHERE a.ciclo_id = ${cid}::uuid
        ORDER BY a.nombre, r.dia_semana`;
    } catch {
      // La tabla aún no existe en este servidor → sin recesos.
      return [];
    }
  }

  /** Crea o actualiza el receso de (aula, día). Bloquea si choca con una clase. */
  async upsert(dto: CreateRecesoDto): Promise<RecesoRow> {
    if (dto.hora_inicio >= dto.hora_fin) {
      throw new BadRequestException('La hora de inicio del receso debe ser anterior a la de fin');
    }

    // Bloqueo: no puede solaparse con un horario de clase de esa aula ese día.
    const choque = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM horarios
      WHERE aula_id = ${dto.aula_id}::uuid
        AND dia_semana = ${dto.dia_semana}
        AND hora_inicio < ${dto.hora_fin}::time
        AND hora_fin    > ${dto.hora_inicio}::time
      LIMIT 1`;
    if (choque.length > 0) {
      throw new BadRequestException('El receso se solapa con una clase ya asignada en ese día');
    }

    const rows = await this.prisma.$queryRaw<RecesoRow[]>`
      INSERT INTO recesos (aula_id, dia_semana, hora_inicio, hora_fin)
      VALUES (${dto.aula_id}::uuid, ${dto.dia_semana}, ${dto.hora_inicio}::time, ${dto.hora_fin}::time)
      ON CONFLICT (aula_id, dia_semana) DO UPDATE
        SET hora_inicio = EXCLUDED.hora_inicio, hora_fin = EXCLUDED.hora_fin
      RETURNING *`;
    return rows[0];
  }

  async remove(id: string): Promise<{ success: boolean }> {
    await this.prisma.$executeRaw`DELETE FROM recesos WHERE id = ${id}::uuid`;
    return { success: true };
  }
}
