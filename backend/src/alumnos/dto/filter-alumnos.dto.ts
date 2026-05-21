import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export type EstadoAlumno = 'activo' | 'observado' | 'riesgo' | 'inactivo';

export class FilterAlumnosDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'UUID del ciclo' })
  @IsOptional()
  @IsUUID()
  ciclo_id?: string;

  @ApiPropertyOptional({ description: 'UUID del aula' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ enum: ['activo', 'observado', 'riesgo', 'inactivo'] })
  @IsOptional()
  @IsIn(['activo', 'observado', 'riesgo', 'inactivo'])
  estado?: EstadoAlumno;
}
