import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class ManualCorrectionDto {
  @ApiPropertyOptional({ description: 'Marcar como tardanza (true) o puntual (false)' })
  @IsOptional()
  @IsBoolean()
  es_tardanza?: boolean;

  @ApiPropertyOptional({ description: 'Motivo o observación de la corrección manual' })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiPropertyOptional({
    description: 'Hora de llegada en formato HH:mm',
    example: '08:15',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'hora_llegada debe tener formato HH:mm' })
  hora_llegada?: string;
}
