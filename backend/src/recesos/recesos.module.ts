import { Module } from '@nestjs/common';
import { RecesosService } from './recesos.service';
import { RecesosController } from './recesos.controller';

@Module({
  controllers: [RecesosController],
  providers: [RecesosService],
  exports: [RecesosService],
})
export class RecesosModule {}
