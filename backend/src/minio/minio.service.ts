import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

const FOTOS_BUCKET      = 'sga-fotos';
const BIBLIOTECA_BUCKET = 'sga-biblioteca';

// Validez de las URLs prefirmadas (segundos). 6 horas: suficiente para una
// sesión de uso; los navegadores reciben una URL nueva en cada carga.
const PRESIGN_EXPIRY = 6 * 60 * 60;

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;        // conexión interna (subir/borrar)
  private presignClient: Minio.Client; // firma URLs con el host público

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new Minio.Client({
      endPoint:  this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port:      Number(this.config.get<string>('MINIO_PORT') ?? 9000),
      useSSL:    this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY') ?? '',
      secretKey: this.config.get<string>('MINIO_SECRET_KEY') ?? '',
    });

    // Cliente solo para FIRMAR URLs: usa el endpoint PÚBLICO (sga.intranet) que
    // abrirá el navegador del cliente. La firma es local (no hace red), por lo
    // que no importa que el backend no resuelva ese host.
    this.presignClient = new Minio.Client({
      endPoint:  this.config.get<string>('MINIO_PUBLIC_ENDPOINT')
              ?? this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port:      Number(this.config.get<string>('MINIO_PUBLIC_PORT')
              ?? this.config.get<string>('MINIO_PORT') ?? 9000),
      useSSL:    this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY') ?? '',
      secretKey: this.config.get<string>('MINIO_SECRET_KEY') ?? '',
    });

    // No bloqueamos el arranque: si MinIO no está disponible, los buckets
    // se intentan crear en background y se loguea el warning.
    this.ensureBucket(FOTOS_BUCKET).catch(() => {});
    this.ensureBucket(BIBLIOTECA_BUCKET).catch(() => {});
  }

  /* ── helpers ───────────────────────────────────────────────── */

  private async ensureBucket(bucket: string) {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        // Bucket PRIVADO (sin política pública). El acceso es solo vía URLs
        // prefirmadas que genera el backend.
        await this.client.makeBucket(bucket);
        this.logger.log(`Bucket '${bucket}' creado (privado)`);
      }
    } catch (err) {
      this.logger.warn(`No se pudo asegurar el bucket '${bucket}': ${err}`);
    }
  }

  /**
   * Convierte una URL almacenada (http://host/bucket/key) en una URL prefirmada
   * temporal, válida aunque el bucket sea privado. Devuelve null si no hay URL.
   */
  async presign(storedUrl: string | null | undefined): Promise<string | null> {
    if (!storedUrl) return null;
    try {
      const u = new URL(storedUrl);
      const path = u.pathname.replace(/^\/+/, ''); // "bucket/key..."
      const slash = path.indexOf('/');
      if (slash < 0) return storedUrl;
      const bucket = path.slice(0, slash);
      // Solo firmamos archivos de NUESTROS buckets; las URLs externas
      // (YouTube, enlaces, etc.) se devuelven sin tocar.
      if (bucket !== FOTOS_BUCKET && bucket !== BIBLIOTECA_BUCKET) return storedUrl;
      const key = decodeURIComponent(path.slice(slash + 1));
      return await this.presignClient.presignedGetObject(bucket, key, PRESIGN_EXPIRY);
    } catch {
      return storedUrl; // si no es una URL parseable, devolver tal cual
    }
  }

  private buildUrl(bucket: string, key: string): string {
    // El endpoint PÚBLICO (lo que abren los navegadores de los clientes) debe ser
    // accesible desde el hotspot (ej. sga.intranet), NO 127.0.0.1, que solo vale
    // para la conexión interna del backend. Se usa MINIO_PUBLIC_ENDPOINT si existe.
    const endpoint =
      this.config.get<string>('MINIO_PUBLIC_ENDPOINT') ??
      this.config.get<string>('MINIO_ENDPOINT') ??
      'localhost';
    const port =
      this.config.get<string>('MINIO_PUBLIC_PORT') ??
      this.config.get<string>('MINIO_PORT') ??
      '9000';
    const ssl = this.config.get<string>('MINIO_USE_SSL') === 'true';
    return `${ssl ? 'https' : 'http'}://${endpoint}:${port}/${bucket}/${key}`;
  }

  /* ── API pública — fotos ───────────────────────────────────── */

  async subirFoto(
    folder: 'alumnos' | 'docentes',
    entityId: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    const ext = (mimetype.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const key = `fotos/${folder}/${entityId}.${ext}`;

    await this.client.putObject(
      FOTOS_BUCKET, key, buffer, buffer.length,
      { 'Content-Type': mimetype },
    );

    return this.buildUrl(FOTOS_BUCKET, key);
  }

  async eliminarFotoPorUrl(url: string): Promise<void> {
    try {
      const parts = url.split(`/${FOTOS_BUCKET}/`);
      if (parts.length < 2) return;
      await this.client.removeObject(FOTOS_BUCKET, parts[1]);
    } catch { /* silencioso */ }
  }

  /* ── API pública — biblioteca ──────────────────────────────── */

  async subirPdfBiblioteca(
    recursoId: string,
    buffer: Buffer,
  ): Promise<string> {
    const key = `pdf/${recursoId}.pdf`;

    await this.client.putObject(
      BIBLIOTECA_BUCKET, key, buffer, buffer.length,
      { 'Content-Type': 'application/pdf' },
    );

    return this.buildUrl(BIBLIOTECA_BUCKET, key);
  }

  async eliminarPdfBibliotecaPorUrl(url: string): Promise<void> {
    try {
      const parts = url.split(`/${BIBLIOTECA_BUCKET}/`);
      if (parts.length < 2) return;
      await this.client.removeObject(BIBLIOTECA_BUCKET, parts[1]);
    } catch { /* silencioso */ }
  }
}
