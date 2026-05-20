import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSeccionDto {
  @ApiProperty({ example: 'Sección A', description: 'Nombre de la sección' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'UUID del ciclo al que pertenece esta sección' })
  @IsUUID()
  @IsNotEmpty()
  ciclo_id: string;

  @ApiPropertyOptional({ example: 'Aula 101', description: 'Nombre o número del aula' })
  @IsOptional()
  @IsString()
  aula?: string;
}
