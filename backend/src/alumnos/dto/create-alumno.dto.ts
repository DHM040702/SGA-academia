import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsEmail, IsIn, IsOptional, IsString,
  IsUUID, Length, Matches, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VincularApoderadoDto } from './vincular-apoderado.dto';

export class CreateAlumnoDto {
  /** DNI del alumno (8 dígitos) */
  @ApiProperty({ example: '76543210' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  dni: string;

  @ApiPropertyOptional({
    description: 'Código de barras / inscripción (6 dígitos). Si se omite, se autogenera.',
    example: '605265',
  })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'El código debe tener exactamente 6 dígitos' })
  codigo?: string;

  @ApiProperty({ example: 'Lucía' })
  @IsString()
  @Length(2, 100)
  nombres: string;

  @ApiProperty({ example: 'Mendoza Quiroz' })
  @IsString()
  @Length(2, 100)
  apellidos: string;

  @ApiPropertyOptional({
    description: 'Correo institucional. Opcional: si se omite se autogenera a partir del código.',
    example: 'lucia.mendoza@unasam.edu.pe',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Opcional. Si se omite, la contraseña temporal es el DNI.' })
  @IsOptional()
  @IsString()
  @Length(6, 100)
  password?: string;

  @ApiPropertyOptional({ enum: ['masculino', 'femenino'], example: 'femenino' })
  @IsOptional()
  @IsIn(['masculino', 'femenino'])
  genero?: string;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @ApiProperty({ description: 'Teléfono de contacto (obligatorio).', example: '+51943221887' })
  @IsString()
  @Length(6, 20)
  telefono: string;

  @ApiPropertyOptional({ description: 'Colegio de procedencia.', example: 'I.E. San Marcos' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  colegio?: string;

  @ApiPropertyOptional({ description: '¿Culminó 5.º de secundaria?', example: true })
  @IsOptional()
  @IsBoolean()
  quinto?: boolean;

  @ApiPropertyOptional({ description: 'UUID del aula asignada' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ description: 'UUID de la carrera profesional del alumno' })
  @IsOptional()
  @IsUUID()
  carrera_id?: string;

  /** Crear o vincular un apoderado al registrar el alumno (opcional) */
  @ApiPropertyOptional({ type: VincularApoderadoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VincularApoderadoDto)
  apoderado?: VincularApoderadoDto;
}
