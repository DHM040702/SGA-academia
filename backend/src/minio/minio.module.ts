import { Global, Module } from '@nestjs/common';
import { MinioService } from './minio.service';

/**
 * @Global — basta con importar este módulo una sola vez en AppModule.
 * Todos los demás módulos pueden inyectar MinioService sin declaración extra.
 */
@Global()
@Module({
  providers: [MinioService],
  exports:   [MinioService],
})
export class MinioModule {}
