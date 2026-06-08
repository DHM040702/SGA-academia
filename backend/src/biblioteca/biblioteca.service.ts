import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoRecurso } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { FilterBibliotecaDto } from './dto/filter-biblioteca.dto';

// Tipo local para historial (tabla nueva — cliente Prisma no regenerado)
interface HistorialRow {
  id:                   string;
  recurso_id:           string;
  titulo_anterior:      string | null;
  descripcion_anterior: string | null;
  url_anterior:         string | null;
  nivel_anterior:       string | null;
  curso_id_anterior:    string | null;
  modificado_por_id:    string;
  modificado_at:        Date;
  editor_email?:        string;
}

const INCLUDE = {
  subidoPor: { select: { id: true, email: true } },
  curso:     { select: { id: true, nombre: true, codigo: true } },
} as const;

@Injectable()
export class BibliotecaService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  /* ── Listar ───────────────────────────────────────────────────── */

  async findAll(dto: FilterBibliotecaDto) {
    const { page = 1, limit = 20, q, tipo, curso_id } = dto;
    const skip = (page - 1) * limit;

    const where: any = { activo: true };
    if (tipo)     where.tipo    = tipo;
    if (curso_id) where.cursoId = curso_id;
    if (q) {
      where.OR = [
        { titulo:      { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.recursoBiblioteca.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: INCLUDE,
      }),
      this.prisma.recursoBiblioteca.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  /* ── Detalle ──────────────────────────────────────────────────── */

  async findOne(id: string) {
    const recurso = await this.prisma.recursoBiblioteca.findFirst({
      where: { id, activo: true },
      include: INCLUDE,
    });
    if (!recurso) throw new NotFoundException('Recurso de biblioteca no encontrado');

    void this.prisma.recursoBiblioteca.update({
      where: { id },
      data: { descargas: { increment: 1 } },
    });

    return recurso;
  }

  /* ── Crear (con subida opcional de PDF) ───────────────────────── */

  async create(
    dto: CreateRecursoDto,
    subidoPorId: string,
    file?: Express.Multer.File,
  ) {
    // Validar: PDF requiere archivo o URL; otros tipos requieren URL
    if (dto.tipo === TipoRecurso.pdf) {
      if (!file && !dto.url) {
        throw new BadRequestException('Para PDFs debe subir un archivo o proporcionar una URL.');
      }
    } else {
      if (!dto.url) {
        throw new BadRequestException('Para este tipo de recurso debe proporcionar una URL.');
      }
    }

    // Si hay archivo PDF → subir a MinIO primero con ID temporal
    let urlFinal = dto.url ?? '';

    const recurso = await this.prisma.recursoBiblioteca.create({
      data: {
        titulo:      dto.titulo,
        descripcion: dto.descripcion,
        tipo:        dto.tipo,
        url:         urlFinal,
        nivel:       dto.nivel,
        cursoId:     dto.curso_id ?? null,
        subidoPorId,
        activo:      true,
      },
      include: INCLUDE,
    });

    // Subir PDF con el ID real del recurso y actualizar URL
    if (file && dto.tipo === TipoRecurso.pdf) {
      urlFinal = await this.minio.subirPdfBiblioteca(recurso.id, file.buffer);
      await this.prisma.recursoBiblioteca.update({
        where: { id: recurso.id },
        data:  { url: urlFinal },
      });
      return { ...recurso, url: urlFinal };
    }

    return recurso;
  }

  /* ── Editar (con auditoría + control de propiedad para docentes) ─ */

  async update(
    id: string,
    dto: UpdateRecursoDto,
    caller: { id: string; rol: string },
    file?: Express.Multer.File,
  ) {
    const recurso = await this.prisma.recursoBiblioteca.findFirst({
      where: { id, activo: true },
    });
    if (!recurso) throw new NotFoundException('Recurso de biblioteca no encontrado');

    // Docentes solo pueden editar sus propios recursos
    if (caller.rol === 'docente' && recurso.subidoPorId !== caller.id) {
      throw new ForbiddenException('Solo puedes editar recursos que hayas subido tú.');
    }

    // Guardar snapshot anterior en historial (raw SQL — tabla nueva)
    try {
      await this.prisma.$executeRaw`
        INSERT INTO recursos_biblioteca_historial
          (recurso_id, titulo_anterior, descripcion_anterior, url_anterior,
           nivel_anterior, curso_id_anterior, modificado_por_id)
        VALUES (
          ${id}::uuid,
          ${recurso.titulo},
          ${recurso.descripcion ?? null},
          ${recurso.url},
          ${recurso.nivel ?? null},
          ${recurso.cursoId ?? null}::uuid,
          ${caller.id}::uuid
        )
      `;
    } catch {
      // Tabla historial aún no creada — continuar de todas formas
    }

    // Si llega nuevo PDF → subir a MinIO y reemplazar
    let nuevaUrl = dto.url;
    if (file && (dto.tipo ?? recurso.tipo) === TipoRecurso.pdf) {
      // Eliminar PDF anterior si era de MinIO
      if (recurso.url?.includes('sga-biblioteca')) {
        void this.minio.eliminarPdfBibliotecaPorUrl(recurso.url);
      }
      nuevaUrl = await this.minio.subirPdfBiblioteca(id, file.buffer);
    }

    return this.prisma.recursoBiblioteca.update({
      where: { id },
      data: {
        ...(dto.titulo       !== undefined && { titulo:       dto.titulo }),
        ...(dto.descripcion  !== undefined && { descripcion:  dto.descripcion }),
        ...(dto.tipo         !== undefined && { tipo:         dto.tipo }),
        ...(nuevaUrl         !== undefined && { url:          nuevaUrl }),
        ...(dto.nivel        !== undefined && { nivel:        dto.nivel }),
        ...(dto.curso_id     !== undefined && { cursoId:      dto.curso_id }),
      },
      include: INCLUDE,
    });
  }

  /* ── Eliminar (soft delete + borrar PDF de MinIO) ─────────────── */

  async remove(id: string) {
    const recurso = await this.prisma.recursoBiblioteca.findFirst({
      where: { id, activo: true },
    });
    if (!recurso) throw new NotFoundException('Recurso de biblioteca no encontrado');

    // Borrar archivo de MinIO si aplica
    if (recurso.tipo === TipoRecurso.pdf && recurso.url?.includes('sga-biblioteca')) {
      void this.minio.eliminarPdfBibliotecaPorUrl(recurso.url);
    }

    await this.prisma.recursoBiblioteca.update({
      where: { id },
      data: { activo: false },
    });
    return { success: true };
  }

  /* ── Stats ────────────────────────────────────────────────────── */

  async stats() {
    const [total_pdf, total_video, total_enlace, total_iframe] = await Promise.all([
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.pdf,    activo: true } }),
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.video,  activo: true } }),
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.enlace, activo: true } }),
      this.prisma.recursoBiblioteca.count({ where: { tipo: TipoRecurso.iframe, activo: true } }),
    ]);
    return { total_pdf, total_video, total_enlace, total_iframe };
  }

  /* ── Historial de ediciones ───────────────────────────────────── */

  async historial(recursoId: string) {
    try {
      const rows = await this.prisma.$queryRaw<HistorialRow[]>`
        SELECT h.*, u.email AS editor_email
        FROM recursos_biblioteca_historial h
        JOIN usuarios u ON u.id = h.modificado_por_id
        WHERE h.recurso_id = ${recursoId}::uuid
        ORDER BY h.modificado_at DESC
        LIMIT 50
      `;
      return rows;
    } catch {
      return [];
    }
  }
}
