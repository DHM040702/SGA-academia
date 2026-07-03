import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum EstadoInasistencia {
  todas = 'todas',
  pendientes = 'pendientes',
  justificadas = 'justificadas',
}

export class FilterInasistenciasDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Fecha inicial (YYYY-MM-DD). Por defecto: 30 días atrás.', example: '2026-06-01' })
  @IsOptional()
  @IsISO8601({ strict: false })
  desde?: string;

  @ApiPropertyOptional({ description: 'Fecha final (YYYY-MM-DD). Por defecto: hoy.', example: '2026-07-01' })
  @IsOptional()
  @IsISO8601({ strict: false })
  hasta?: string;

  @ApiPropertyOptional({ description: 'UUID del aula', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ enum: EstadoInasistencia, description: 'Filtrar por estado de justificación' })
  @IsOptional()
  @IsEnum(EstadoInasistencia)
  estado?: EstadoInasistencia;

  @ApiPropertyOptional({ description: 'Buscar por nombre, apellidos, código o DNI del alumno' })
  @IsOptional()
  @IsString()
  q?: string;
}
