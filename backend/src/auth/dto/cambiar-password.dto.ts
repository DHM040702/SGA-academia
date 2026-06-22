import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @ApiProperty({ required: false, description: 'Contraseña actual (solo requerida en cambios voluntarios)' })
  @IsOptional()
  @IsString()
  actual?: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  nueva: string;
}
