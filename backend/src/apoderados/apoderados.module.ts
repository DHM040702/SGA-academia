import { Module } from '@nestjs/common';
import { ApoderadosService } from './apoderados.service';
import { ApoderadosController } from './apoderados.controller';

@Module({
  controllers: [ApoderadosController],
  providers: [ApoderadosService],
  exports: [ApoderadosService],
})
export class ApoderadosModule {}
