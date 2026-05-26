import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Turno } from '@prisma/client';

export class CerrarTurnoDto {
  @ApiProperty({ enum: Turno, description: 'Turno a cerrar (manana / tarde)' })
  @IsEnum(Turno)
  turno: Turno;
}
