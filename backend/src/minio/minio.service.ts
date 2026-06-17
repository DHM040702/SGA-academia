import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

const FOTOS_BUCKET      = 'sga-fotos';
const BIBLIOTECA_BUCKET = 'sga-biblioteca';

const publicReadPolicy = (bucket: string) =>
  JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect:    'Allow',
        Principal: { AWS: ['*'] },
        Action:    ['s3:GetObject'],
        Resource:  [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new Minio.Client({
      endPoint:  this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port:      Number(this.config.get<string>('MINIO_PORT') ?? 9000),
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
        await this.client.makeBucket(bucket);
        await this.client.setBucketPolicy(bucket, publicReadPolicy(bucket));
        this.logger.log(`Bucket '${bucket}' creado con política pública`);
      }
    } catch (err) {
      this.logger.warn(`No se pudo asegurar el bucket '${bucket}': ${err}`);
    }
  }

  private buildUrl(bucket: string, key: string): string {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port     = this.config.get<string>('MINIO_PORT')     ?? '9000';
    const ssl      = this.config.get<string>('MINIO_USE_SSL')  === 'true';
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
