import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoPersona, Turno } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterAsistenciaDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre, apellidos, código o DNI de la persona' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Fecha exacta en formato YYYY-MM-DD', example: '2026-05-20' })
  @IsOptional()
  @IsISO8601({ strict: false })
  fecha?: string;

  @ApiPropertyOptional({ description: 'Rango: fecha inicial YYYY-MM-DD (ignorada si se envía `fecha`)', example: '2026-05-01' })
  @IsOptional()
  @IsISO8601({ strict: false })
  desde?: string;

  @ApiPropertyOptional({ description: 'Rango: fecha final YYYY-MM-DD (ignorada si se envía `fecha`)', example: '2026-05-31' })
  @IsOptional()
  @IsISO8601({ strict: false })
  hasta?: string;

  @ApiPropertyOptional({ description: 'UUID del aula', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ description: 'UUID del alumno', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  alumno_id?: string;

  @ApiPropertyOptional({ description: 'UUID del docente', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  docente_id?: string;

  @ApiPropertyOptional({ enum: TipoPersona, description: 'Filtrar por tipo: alumno o docente' })
  @IsOptional()
  @IsEnum(TipoPersona)
  tipo?: TipoPersona;

  @ApiPropertyOptional({ enum: Turno, description: 'Filtrar por turno del aula (manana/tarde)' })
  @IsOptional()
  @IsEnum(Turno)
  turno?: Turno;
}
