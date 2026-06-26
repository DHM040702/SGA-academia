import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateRecesoDto {
  @ApiProperty({ description: 'UUID del aula' })
  @IsUUID()
  @IsNotEmpty()
  aula_id: string;

  @ApiProperty({ example: 1, description: 'Día de la semana (1=Lunes … 7=Domingo)', minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  dia_semana: number;

  @ApiProperty({ example: '09:30', description: 'Hora de inicio del receso (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'hora_inicio debe tener formato HH:mm (24h)' })
  hora_inicio: string;

  @ApiProperty({ example: '09:50', description: 'Hora de fin del receso (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'hora_fin debe tener formato HH:mm (24h)' })
  hora_fin: string;
}
