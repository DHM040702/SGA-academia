import { Module } from '@nestjs/common';
import { FotosControlController } from './fotos-control.controller';
import { FotosControlService } from './fotos-control.service';

@Module({
  controllers: [FotosControlController],
  providers:   [FotosControlService],
})
export class FotosControlModule {}
