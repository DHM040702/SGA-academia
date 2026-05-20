import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { EstadoAsistencia } from '@prisma/client';

export class ManualCorrectionDto {
  @ApiProperty({ enum: EstadoAsistencia, description: 'Nuevo estado de asistencia' })
  @IsEnum(EstadoAsistencia)
  estado: EstadoAsistencia;

  @ApiPropertyOptional({ description: 'Observación o motivo de la corrección' })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiPropertyOptional({
    description: 'Hora de llegada en formato HH:mm',
    example: '08:15',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora_llegada debe tener formato HH:mm',
  })
  hora_llegada?: string;
}
