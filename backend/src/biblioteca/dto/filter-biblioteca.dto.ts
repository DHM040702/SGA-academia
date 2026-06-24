import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'UUID del curso', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  curso_id?: string;

  @ApiPropertyOptional({ description: 'UUID del aula', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;
}
