import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JustificarAusenciaDto {
  @ApiProperty({ description: 'Motivo o razón de la justificación' })
  @IsString()
  @MaxLength(500)
  razon: string;

  @ApiPropertyOptional({ description: 'Número o código del documento que aprueba la justificación' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  doc_num?: string;
}
