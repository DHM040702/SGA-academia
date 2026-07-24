import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateApoderadoDto {
  @ApiProperty({ example: 'María' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'Pérez Gómez' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  apellidos: string;

  @ApiProperty({ example: '76543210', description: 'DNI de 8 dígitos' })
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' })
  dni: string;

  @ApiProperty({ example: '987654321' })
  @IsString() @MinLength(6) @MaxLength(20)
  telefono_whatsapp: string;

  @ApiPropertyOptional({
    description: 'Correo de acceso. Opcional: si se omite se autogenera a partir del DNI.',
    example: 'apoderado@correo.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ minLength: 8, description: 'Opcional: si se omite, la contraseña inicial es el DNI' })
  @IsOptional()
  @IsString() @MinLength(8) @MaxLength(72)
  password?: string;
}
