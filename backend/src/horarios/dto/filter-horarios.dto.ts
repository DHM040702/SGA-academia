import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterHorariosDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por aula (UUID)' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por docente (UUID)' })
  @IsOptional()
  @IsUUID()
  docente_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por día de semana (1=Lunes…7=Domingo)', minimum: 1, maximum: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dia_semana?: number;

  @ApiPropertyOptional({ description: 'Filtrar por estado de publicación' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  publicado?: boolean;
}
