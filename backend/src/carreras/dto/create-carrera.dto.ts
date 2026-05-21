import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Area } from '@prisma/client';

export class CreateCarreraDto {
  @ApiProperty({ example: 'Ing. Civil', description: 'Nombre de la carrera profesional' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ enum: Area, description: 'Área a la que pertenece la carrera' })
  @IsEnum(Area)
  area: Area;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
