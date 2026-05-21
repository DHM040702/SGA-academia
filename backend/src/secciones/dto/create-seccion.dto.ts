import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Area, Turno } from '@prisma/client';

export class CreateSeccionDto {
  @ApiProperty({ example: 'A-M', description: 'Código de la sección (ej. A-M, B-T, C-M)' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'UUID del ciclo al que pertenece esta sección' })
  @IsUUID()
  @IsNotEmpty()
  ciclo_id: string;

  @ApiProperty({ enum: Turno, description: 'Turno: manana o tarde' })
  @IsEnum(Turno)
  turno: Turno;

  @ApiProperty({ enum: Area, description: 'Área académica: ciencias, letras o medicas' })
  @IsEnum(Area)
  area: Area;

  @ApiPropertyOptional({ example: 'Ing. Civil, Sistemas, Agronómica', description: 'Carreras profesionales objetivo' })
  @IsOptional()
  @IsString()
  carrera?: string;

  @ApiPropertyOptional({ example: 40, description: 'Cupo máximo de alumnos', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cupo_maximo?: number;
}
