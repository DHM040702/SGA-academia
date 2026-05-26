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

  /** Requerido cuando rol = apoderado */
  @ApiPropertyOptional({ type: PerfilApoderadoDto })
  @ValidateIf((o) => o.rol === Rol.apoderado)
  @ValidateNested()
  @Type(() => PerfilApoderadoDto)
  perfil?: PerfilApoderadoDto;
}
