import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Turno } from '@prisma/client';

export class CreateSeccionDto {
  @ApiProperty({ example: 'Sección A', description: 'Nombre de la sección' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'UUID del ciclo al que pertenece esta sección' })
  @IsUUID()
  @IsNotEmpty()
  ciclo_id: string;

  @ApiProperty({ enum: Turno, description: 'Turno de la sección' })
  @IsEnum(Turno)
  turno: Turno;

  @ApiPropertyOptional({ example: '5to Secundaria', description: 'Nivel académico' })
  @IsOptional()
  @IsString()
  nivel?: string;

  @ApiPropertyOptional({ example: 40, description: 'Cupo máximo de alumnos', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cupo_maximo?: number;
}
