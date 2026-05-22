import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsISO8601, IsOptional,
  IsString, IsUUID, Matches,
} from 'class-validator';
import { TipoPersona } from '@prisma/client';

export class CreateManualAsistenciaDto {
  @ApiProperty({ enum: TipoPersona, description: 'alumno o docente' })
  @IsEnum(TipoPersona)
  tipo_persona: TipoPersona;

  @ApiPropertyOptional({ format: 'uuid', description: 'Requerido si tipo_persona = alumno' })
  @IsOptional()
  @IsUUID()
  alumno_id?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Requerido si tipo_persona = docente' })
  @IsOptional()
  @IsUUID()
  docente_id?: string;

  @ApiProperty({ example: '2026-05-22', description: 'Fecha en formato YYYY-MM-DD' })
  @IsISO8601({ strict: false })
  fecha: string;

  @ApiProperty({ example: '08:15', description: 'Hora de llegada en formato HH:mm' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'hora_llegada debe tener formato HH:mm' })
  hora_llegada: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  es_tardanza?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string;
}
