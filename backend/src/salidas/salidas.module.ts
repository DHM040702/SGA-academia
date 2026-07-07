import { Module } from '@nestjs/common';
import { SalidasController } from './salidas.controller';
import { SalidasService } from './salidas.service';

@Module({
  controllers: [SalidasController],
  providers: [SalidasService],
})
export class SalidasModule {}
