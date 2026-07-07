import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class CreateSalidaDto {
  @ApiProperty({ description: 'UUID del alumno que se retira' })
  @IsUUID()
  alumno_id: string;

  @ApiProperty({ description: 'Explicación breve del motivo de la salida', maxLength: 300 })
  @IsString()
  @Length(3, 300)
  motivo: string;
}
