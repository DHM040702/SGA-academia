import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEmail, IsOptional, IsString,
  IsUUID, Length, Matches,
} from 'class-validator';

export class CreateAlumnoDto {
  /** DNI del alumno (8 dígitos) */
  @ApiProperty({ example: '76543210' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  dni: string;

  @ApiProperty({ example: 'Lucía' })
  @IsString()
  @Length(2, 100)
  nombres: string;

  @ApiProperty({ example: 'Mendoza Quiroz' })
  @IsString()
  @Length(2, 100)
  apellidos: string;

  @ApiProperty({ example: 'lucia.mendoza@unasam.edu.pe' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Temporal1234!' })
  @IsString()
  @Length(8, 100)
  password: string;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiPropertyOptional({ example: '+51943221887' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seccion_id?: string;
}
