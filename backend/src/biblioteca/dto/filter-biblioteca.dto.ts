import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoRecurso, Area } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterBibliotecaDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TipoRecurso, description: 'Filtrar por tipo de recurso' })
  @IsOptional()
  @IsEnum(TipoRecurso)
  tipo?: TipoRecurso;

  @ApiPropertyOptional({ enum: Area, description: 'Filtrar por área (incluye recursos para todas las áreas)' })
  @IsOptional()
  @IsEnum(Area)
  area?: Area;

  @ApiPropertyOptional({ description: 'Solo recursos generales (sin área asignada)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  solo_generales?: boolean;

  @ApiPropertyOptional({ description: 'UUID del curso', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  curso_id?: string;

  @ApiPropertyOptional({ description: 'UUID del aula', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ description: 'Acotar por rango de fechas del ciclo (por fecha de subida)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ciclo_id?: string;
}
