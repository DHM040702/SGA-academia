import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Turno } from '@prisma/client';

export class CerrarTurnoDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtrar por aula específica' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ enum: Turno, description: 'Filtrar por turno (manana/tarde)' })
  @IsOptional()
  @IsEnum(Turno)
  turno?: Turno;
}
