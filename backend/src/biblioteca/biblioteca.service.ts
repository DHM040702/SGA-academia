import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoRecurso, Area } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { FilterBibliotecaDto } from './dto/filter-biblioteca.dto';

// Tipo local para historial (tabla nueva — cliente Prisma no regenerado)
export interface HistorialRow {
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

  /**
   * Áreas que el usuario tiene permitido ver (control de acceso REAL, no confía
   * en el frontend):
   *  - admin/director/docente/auxiliar → null (sin restricción).
   *  - alumno → el área de su aula.
   *  - apoderado → las áreas de sus pupilos.
   * Los recursos "generales" (area null) son visibles para todos.
   */
  private async allowedAreas(user?: { id: string; rol: string }): Promise<Area[] | null> {
    if (!user) return null;
    if (user.rol === 'alumno') {
      const al = await this.prisma.alumno.findFirst({
        where: { usuarioId: user.id, deletedAt: null },
        select: { aula: { select: { area: true } } },
      });
      return al?.aula?.area ? [al.aula.area] : [];
    }
    if (user.rol === 'apoderado') {
      const ap = await this.prisma.apoderado.findFirst({
        where: { usuarioId: user.id, deletedAt: null },
        select: { alumnos: { select: { alumno: { select: { aula: { select: { area: true } } } } } } },
      });
      const areas = new Set<Area>();
      for (const link of ap?.alumnos ?? []) {
        const a = link.alumno?.aula?.area;
        if (a) areas.add(a);
      }
      return [...areas];
    }
    return null; // admin, director, docente, auxiliar
  }

  /* ── Listar ───────────────────────────────────────────────────── */

  async findAll(dto: FilterBibliotecaDto, user?: { id: string; rol: string }) {
    const { page = 1, limit = 20, q, tipo, curso_id, area, solo_generales } = dto;
    const skip = (page - 1) * limit;

    const allowed = await this.allowedAreas(user);

    const where: any = { activo: true };
    if (tipo)     where.tipo    = tipo;
    if (curso_id) where.cursoId = curso_id;

    // Se combinan con AND para no pisar el OR del buscador con el del área
    const and: any[] = [];
    // Filtro por área: recursos del área pedida + los de "todas" (area null).
    // solo_generales → únicamente los sin área (para alumnos sin área asignada).
    if (allowed !== null) {
      // Restringido por rol: SOLO su(s) área(s) + generales, ignorando los
      // params del cliente (no se confía en el frontend).
      and.push({ OR: [{ area: { in: allowed } }, { area: null }] });
    } else if (solo_generales) and.push({ area: null });
    else if (area) and.push({ OR: [{ area }, { area: null }] });
    if (q) {
      and.push({
        OR: [
          { titulo:      { contains: q, mode: 'insensitive' } },
          { descripcion: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const [items, total] = await Promise.all([
      this.prisma.recursoBiblioteca.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: INCLUDE,
      }),
      this.prisma.recursoBiblioteca.count({ where }),
    ]);

    // Firmar las URLs de archivos en MinIO (los externos quedan igual)
    const withUrls = await Promise.all(
      items.map(async (r) => ({ ...r, url: (await this.minio.presign(r.url)) ?? r.url })),
    );

    return paginate(withUrls, total, page, limit);
  }

  /* ── Detalle ──────────────────────────────────────────────────── */

  async findOne(id: string, user?: { id: string; rol: string }) {
    const allowed = await this.allowedAreas(user);
    const recurso = await this.prisma.recursoBiblioteca.findFirst({
      // Mismo control de acceso que findAll: un alumno/apoderado no puede abrir
      // por id un recurso de un área que no le corresponde.
      where: {
        id, activo: true,
        ...(allowed !== null ? { OR: [{ area: { in: allowed } }, { area: null }] } : {}),
      },
      include: INCLUDE,
    });
    if (!recurso) throw new NotFoundException('Recurso de biblioteca no encontrado');

    void this.prisma.recursoBiblioteca.update({
      where: { id },
      data: { descargas: { increment: 1 } },
    });

    return { ...recurso, url: (await this.minio.presign(recurso.url)) ?? recurso.url };
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
        area:        dto.area ?? null,
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
      return { ...recurso, url: (await this.minio.presign(urlFinal)) ?? urlFinal };
    }

    return { ...recurso, url: (await this.minio.presign(recurso.url)) ?? recurso.url };
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

    const actualizado = await this.prisma.recursoBiblioteca.update({
      where: { id },
      data: {
        ...(dto.titulo       !== undefined && { titulo:       dto.titulo }),
        ...(dto.descripcion  !== undefined && { descripcion:  dto.descripcion }),
        ...(dto.tipo         !== undefined && { tipo:         dto.tipo }),
        ...(nuevaUrl         !== undefined && { url:          nuevaUrl }),
        ...(dto.nivel        !== undefined && { nivel:        dto.nivel }),
        ...(dto.curso_id     !== undefined && { cursoId:      dto.curso_id }),
        ...(dto.area         !== undefined && { area:         dto.area ?? null }),
      },
      include: INCLUDE,
    });
    return { ...actualizado, url: (await this.minio.presign(actualizado.url)) ?? actualizado.url };
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

  async stats(opts?: { area?: Area; solo_generales?: boolean }) {
    // Los conteos respetan el mismo filtro de área que la lista, para que un
    // alumno no vea cantidades de recursos que no le corresponden.
    const areaWhere: any = opts?.solo_generales
      ? { area: null }
      : opts?.area
        ? { OR: [{ area: opts.area }, { area: null }] }
        : {};
    const count = (tipo: TipoRecurso) =>
      this.prisma.recursoBiblioteca.count({ where: { tipo, activo: true, ...areaWhere } });
    const [total_pdf, total_video, total_enlace, total_iframe] = await Promise.all([
      count(TipoRecurso.pdf),
      count(TipoRecurso.video),
      count(TipoRecurso.enlace),
      count(TipoRecurso.iframe),
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
