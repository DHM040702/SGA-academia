import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEmail, IsEnum, IsOptional,
  IsString, Matches, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';

export class UpdatePerfilApoderadoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2)
  nombre?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2)
  apellidos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'DNI debe tener 8 dígitos' })
  dni?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(7)
  telefono_whatsapp?: string;
}

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'nuevo.email@cepre.edu.pe' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: Rol })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: UpdatePerfilApoderadoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePerfilApoderadoDto)
  perfil?: UpdatePerfilApoderadoDto;
}
