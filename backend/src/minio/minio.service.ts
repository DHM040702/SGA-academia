import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

/** Bucket dedicado a fotos de alumnos y docentes */
const FOTOS_BUCKET = 'sga-fotos';

/** Política pública de lectura para el bucket de fotos */
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

    await this.ensureBucket(FOTOS_BUCKET);
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

  private publicUrl(key: string): string {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port     = this.config.get<string>('MINIO_PORT')     ?? '9000';
    const ssl      = this.config.get<string>('MINIO_USE_SSL')  === 'true';
    return `${ssl ? 'https' : 'http'}://${endpoint}:${port}/${FOTOS_BUCKET}/${key}`;
  }

  /* ── API pública ───────────────────────────────────────────── */

  /**
   * Sube una foto (Buffer) a MinIO y devuelve su URL pública.
   *
   * La clave generada es `fotos/{folder}/{entityId}.{ext}`.
   * Si ya existe una foto para esa entidad, se sobreescribe.
   */
  async subirFoto(
    folder: 'alumnos' | 'docentes',
    entityId: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    const ext = (mimetype.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const key = `fotos/${folder}/${entityId}.${ext}`;

    await this.client.putObject(
      FOTOS_BUCKET,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': mimetype },
    );

    return this.publicUrl(key);
  }

  /**
   * Elimina una foto a partir de su URL pública.
   * Extrae la clave del path y la elimina de MinIO.
   * No lanza error si el objeto no existe.
   */
  async eliminarFotoPorUrl(url: string): Promise<void> {
    try {
      // URL format: http://host:port/{bucket}/{key}
      const parts = url.split(`/${FOTOS_BUCKET}/`);
      if (parts.length < 2) return;
      await this.client.removeObject(FOTOS_BUCKET, parts[1]);
    } catch {
      // silencioso si no existe
    }
  }
}
