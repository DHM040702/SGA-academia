import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterSalidasDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por alumno' })
  @IsOptional()
  @IsUUID()
  alumno_id?: string;

  @ApiPropertyOptional({ description: 'Acotar al rango de fechas de un ciclo' })
  @IsOptional()
  @IsUUID()
  ciclo_id?: string;

  @ApiPropertyOptional({ description: 'Desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601({ strict: false })
  desde?: string;

  @ApiPropertyOptional({ description: 'Hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601({ strict: false })
  hasta?: string;
}
