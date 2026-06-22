import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @ApiProperty({ description: 'Contraseña actual (al primer ingreso, es el DNI)' })
  @IsString()
  actual: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  nueva: string;
}
