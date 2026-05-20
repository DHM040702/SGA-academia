import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DiaSemana } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterHorariosDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por sección (UUID)' })
  @IsOptional()
  @IsUUID()
  seccion_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por docente (UUID)' })
  @IsOptional()
  @IsUUID()
  docente_id?: string;

  @ApiPropertyOptional({ enum: DiaSemana, description: 'Filtrar por día de la semana' })
  @IsOptional()
  @IsEnum(DiaSemana)
  dia_semana?: DiaSemana;
}
