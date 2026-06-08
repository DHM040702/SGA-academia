import { Module } from '@nestjs/common';
import { BibliotecaController } from './biblioteca.controller';
import { BibliotecaService } from './biblioteca.service';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [BibliotecaController],
  providers: [BibliotecaService],
  exports: [BibliotecaService],
})
export class BibliotecaModule {}
