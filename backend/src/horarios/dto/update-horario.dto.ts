import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateHorarioDto } from './create-horario.dto';

export class UpdateHorarioDto extends PartialType(CreateHorarioDto) {
  @IsOptional()
  @IsBoolean()
  publicado?: boolean;
}
