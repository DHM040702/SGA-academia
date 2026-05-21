import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RegisterScanDto {
  @ApiProperty({
    description: 'Código de barras de 6 dígitos (alumno) o DNI (docente)',
    example: '100001',
  })
  @IsString()
  @Length(6, 20)
  codigo: string;
}
