import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { TipoPersona } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterAsistenciaDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Fecha en formato YYYY-MM-DD', example: '2026-05-20' })
  @IsOptional()
  @IsISO8601({ strict: false })
  fecha?: string;

  @ApiPropertyOptional({ description: 'UUID de la sección', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  seccion_id?: string;

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
}
