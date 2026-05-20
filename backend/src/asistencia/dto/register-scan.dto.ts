import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TipoAsistencia } from '@prisma/client';

export class RegisterScanDto {
  @ApiProperty({
    description: 'Código de barras de 6 dígitos (alumno) o DNI (docente)',
    example: '100001',
  })
  @IsString()
  @Length(6, 20)
  codigo: string;

  @ApiPropertyOptional({
    enum: TipoAsistencia,
    description: 'Tipo de asistencia. Si no se envía, se auto-detecta por el código.',
  })
  @IsOptional()
  @IsEnum(TipoAsistencia)
  tipo?: TipoAsistencia;
}
