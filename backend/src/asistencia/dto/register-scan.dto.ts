import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class RegisterScanDto {
  @ApiProperty({
    description: 'Código de barras de 6 dígitos (alumno) o DNI (docente)',
    example: '100001',
  })
  @IsString()
  @Length(6, 20)
  codigo: string;

  @ApiPropertyOptional({
    description:
      'Si el código pertenece a un alumno deshabilitado (dado de baja), ' +
      'habilitarlo automáticamente y registrar su asistencia. Solo admin/auxiliar.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  habilitar?: boolean;
}
