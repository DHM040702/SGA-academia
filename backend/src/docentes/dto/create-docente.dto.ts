import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateDocenteDto {
  @ApiProperty({ description: 'DNI de 8 dígitos (también es el código de asistencia)', example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos numéricos' })
  dni: string;

  @ApiProperty({ example: 'Juan Carlos' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'Pérez López' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({ example: 'jperez@academia.edu' })
  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Opcional. Si se omite, la contraseña temporal es el DNI.' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Matemáticas' })
  @IsOptional()
  @IsString()
  especialidad?: string;
}
