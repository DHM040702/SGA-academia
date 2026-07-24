import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

/** Persona (alumno o docente) en el reporte de fotos. */
interface Persona {
  id:        string;
  nombre:    string;
  apellidos: string;
  dni:       string;
  codigo:    string | null; // código de barras (solo alumnos)
  fotoUrl:   string | null; // URL cruda en BD (se presigna en duplicados)
}

interface Integrante extends Omit<Persona, 'fotoUrl'> {
  fotoUrl: string | null;   // presignada para mostrar miniatura
  size:    number;
}

interface Reporte {
  total:        number;
  conFoto:      number;
  sinFotoTotal: number;
  sinFoto:      Omit<Persona, 'fotoUrl'>[];
  duplicados:   { etag: string; integrantes: Integrante[] }[];
}

/** Extrae el UUID del nombre de clave `fotos/<carpeta>/<uuid>.<ext>`. */
const RE_UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpe?g|png)$/i;

@Injectable()
export class FotosControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio:  MinioService,
  ) {}

  /** Reporte de control de fotos de alumnos y docentes. */
  async control() {
    const [alumnos, docentes] = await Promise.all([
      this.reporteAlumnos(),
      this.reporteDocentes(),
    ]);
    return { generadoEn: new Date().toISOString(), alumnos, docentes };
  }

  private async reporteAlumnos(): Promise<Reporte> {
    const registros = await this.prisma.alumno.findMany({
      where:  { deletedAt: null },
      select: { id: true, nombre: true, apellidos: true, dni: true, codigoBarras: true, fotoUrl: true },
      orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
    });
    const objetos = await this.minio.listarObjetos('fotos/alumnos/');
    return this.armar(
      registros.map((r) => ({
        id: r.id, nombre: r.nombre, apellidos: r.apellidos,
        dni: r.dni, codigo: r.codigoBarras, fotoUrl: r.fotoUrl,
      })),
      objetos,
    );
  }

  private async reporteDocentes(): Promise<Reporte> {
    const registros = await this.prisma.docente.findMany({
      where:  { deletedAt: null },
      select: { id: true, nombre: true, apellidos: true, dni: true, fotoUrl: true },
      orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }],
    });
    const objetos = await this.minio.listarObjetos('fotos/docentes/');
    return this.armar(
      registros.map((r) => ({
        id: r.id, nombre: r.nombre, apellidos: r.apellidos,
        dni: r.dni, codigo: null, fotoUrl: r.fotoUrl,
      })),
      objetos,
    );
  }

  /** Cruza el padrón (BD) con los objetos de MinIO y arma cobertura + duplicados. */
  private async armar(
    registros: Persona[],
    objetos: { key: string; etag: string; size: number }[],
  ): Promise<Reporte> {
    const publico = (p: Persona): Omit<Persona, 'fotoUrl'> => ({
      id: p.id, nombre: p.nombre, apellidos: p.apellidos, dni: p.dni, codigo: p.codigo,
    });

    const total   = registros.length;
    const conFoto = registros.filter((r) => r.fotoUrl).length;
    const sinFoto = registros.filter((r) => !r.fotoUrl).map(publico);

    // id → { etag, size } desde el almacenamiento (contenido real).
    const metaPorId = new Map<string, { etag: string; size: number }>();
    for (const o of objetos) {
      const m = o.key.match(RE_UUID);
      if (m && o.etag) metaPorId.set(m[1].toLowerCase(), { etag: o.etag, size: o.size });
    }

    const porId = new Map(registros.map((r) => [r.id.toLowerCase(), r]));

    // Agrupar por ETag (mismo contenido) las personas que existen en el padrón.
    const grupos = new Map<string, Persona[]>();
    for (const [id, meta] of metaPorId) {
      const persona = porId.get(id);
      if (!persona) continue; // objeto huérfano (persona borrada): se ignora
      if (!grupos.has(meta.etag)) grupos.set(meta.etag, []);
      grupos.get(meta.etag)!.push(persona);
    }

    const duplicados: Reporte['duplicados'] = [];
    for (const [etag, personas] of grupos) {
      if (personas.length < 2) continue;
      const integrantes: Integrante[] = [];
      for (const p of personas) {
        integrantes.push({
          ...publico(p),
          fotoUrl: (await this.minio.presign(p.fotoUrl)) ?? p.fotoUrl,
          size:    metaPorId.get(p.id.toLowerCase())?.size ?? 0,
        });
      }
      duplicados.push({ etag, integrantes });
    }
    duplicados.sort((a, b) => b.integrantes.length - a.integrantes.length);

    return { total, conFoto, sinFotoTotal: sinFoto.length, sinFoto, duplicados };
  }
}
