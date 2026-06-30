import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateApoderadoDto {
  @ApiPropertyOptional({ example: 'María' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez Gómez' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  apellidos?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  telefono_whatsapp?: string;

  @ApiPropertyOptional({ example: 'apoderado@correo.com', description: 'Correo de acceso de la cuenta' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Activar/desactivar la cuenta de acceso' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ResetPasswordApoderadoDto {
  @ApiPropertyOptional({ example: 'NuevaClave123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
