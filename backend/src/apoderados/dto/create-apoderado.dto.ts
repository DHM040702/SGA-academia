import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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

  @ApiProperty({ example: 'apoderado@correo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Temporal1234', minLength: 8, description: 'Si se omite, se usa el DNI como contraseña inicial' })
  @IsString() @MinLength(8) @MaxLength(72)
  password: string;
}
