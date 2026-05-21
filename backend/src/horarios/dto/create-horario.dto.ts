import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateHorarioDto {
  @ApiProperty({ description: 'UUID del docente asignado' })
  @IsUUID()
  @IsNotEmpty()
  docente_id: string;

  @ApiProperty({ description: 'UUID del curso asignado' })
  @IsUUID()
  @IsNotEmpty()
  curso_id: string;

  @ApiProperty({ description: 'UUID de la sección asignada' })
  @IsUUID()
  @IsNotEmpty()
  seccion_id: string;

  @ApiProperty({
    example: 1,
    description: 'Día de la semana (1=Lunes … 7=Domingo)',
    minimum: 1,
    maximum: 7,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  dia_semana: number;

  @ApiProperty({ example: '08:00', description: 'Hora de inicio en formato HH:mm' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'hora_inicio debe tener formato HH:mm (24h)' })
  hora_inicio: string;

  @ApiProperty({ example: '10:00', description: 'Hora de fin en formato HH:mm' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'hora_fin debe tener formato HH:mm (24h)' })
  hora_fin: string;

  @ApiPropertyOptional({ example: 'Aula 201', description: 'Aula asignada' })
  @IsOptional()
  @IsString()
  aula?: string;
}
