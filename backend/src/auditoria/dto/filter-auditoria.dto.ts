import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterAuditoriaDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por email del usuario (contiene)' })
  @IsOptional()
  @IsString()
  usuario?: string;

  @ApiPropertyOptional({ description: 'Filtrar por acción (crear, actualizar, eliminar, login, ...)' })
  @IsOptional()
  @IsString()
  accion?: string;

  @ApiPropertyOptional({ description: 'Filtrar por entidad (alumnos, usuarios, ...)' })
  @IsOptional()
  @IsString()
  entidad?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  desde?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  hasta?: string;
}
