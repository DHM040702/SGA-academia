import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '12345678', description: 'DNI del usuario (8–12 dígitos)' })
  @IsString()
  @Matches(/^\d{8,12}$/, { message: 'El DNI debe contener entre 8 y 12 dígitos numéricos' })
  dni: string;

  @ApiProperty({ example: '••••••••' })
  @IsString()
  @MinLength(6)
  password: string;
}
