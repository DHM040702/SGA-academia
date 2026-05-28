import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsOptional, IsString, Matches,
  MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';

export class PerfilApoderadoDto {
  @ApiProperty() @IsString() @MinLength(2)
  nombre: string;

  @ApiProperty() @IsString() @MinLength(2)
  apellidos: string;

  @ApiProperty() @Matches(/^\d{8}$/, { message: 'DNI debe tener 8 dígitos' })
  dni: string;

  @ApiProperty() @IsString() @MinLength(7)
  telefono_whatsapp: string;
}

export class CreateUsuarioDto {
  @ApiProperty({ example: 'juan.garcia@cepre.edu.pe' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Temporal1234!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Rol })
  @IsEnum(Rol)
  rol: Rol;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  activo?: boolean;

  /** Nombre del usuario (admin / director / vigilante) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  /** Apellidos del usuario (admin / director / vigilante) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  apellidos?: string;

  /** DNI para acceso al sistema (8–12 dígitos numéricos) */
  @ApiPropertyOptional({ description: 'DNI de 8–12 dígitos para ingreso al sistema', example: '12345678' })
  @IsOptional()
  @Matches(/^\d{8,12}$/, { message: 'El DNI debe tener entre 8 y 12 dígitos numéricos' })
  dni?: string;

  /** Requerido cuando rol = apoderado */
  @ApiPropertyOptional({ type: PerfilApoderadoDto })
  @ValidateIf((o) => o.rol === Rol.apoderado)
  @ValidateNested()
  @Type(() => PerfilApoderadoDto)
  perfil?: PerfilApoderadoDto;
}
