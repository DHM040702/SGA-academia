import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class JustificarAusenciaDto {
  @ApiProperty({ description: 'Motivo o razón de la justificación' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  razon: string;

  @ApiProperty({ description: 'Número de expediente o referencia al documento aprobado por dirección (obligatorio)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  doc_num: string;
}
