import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterDocentesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por curso asignado (UUID)' })
  @IsOptional()
  @IsUUID()
  curso_id?: string;

  @ApiPropertyOptional({ description: 'Solo docentes con horario en aulas de este ciclo' })
  @IsOptional()
  @IsUUID()
  ciclo_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo/inactivo' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  activo?: boolean;
}
