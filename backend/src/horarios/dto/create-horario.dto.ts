import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { DiaSemana } from '@prisma/client';

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
    enum: DiaSemana,
    example: DiaSemana.lunes,
    description: 'Día de la semana',
  })
  @IsEnum(DiaSemana, { message: 'dia_semana debe ser uno de: lunes, martes, miercoles, jueves, viernes, sabado' })
  dia_semana: DiaSemana;

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
}
