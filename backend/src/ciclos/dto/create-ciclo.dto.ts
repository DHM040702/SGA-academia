import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCicloDto {
  @ApiProperty({ example: 'Ciclo 2026-I', description: 'Nombre del ciclo académico' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: '2026-03-01', description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha_inicio debe tener formato YYYY-MM-DD' })
  fecha_inicio: string;

  @ApiProperty({ example: '2026-07-31', description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha_fin debe tener formato YYYY-MM-DD' })
  fecha_fin: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'Si es el ciclo activo actual' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  activo?: boolean = false;
}
