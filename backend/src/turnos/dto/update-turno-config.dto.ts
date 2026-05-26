import { IsBoolean, IsOptional, Matches } from 'class-validator';

export class UpdateTurnoConfigDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'hora_entrada debe tener formato HH:mm' })
  hora_entrada?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'hora_limite_puntual debe tener formato HH:mm' })
  hora_limite_puntual?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'hora_fin debe tener formato HH:mm' })
  hora_fin?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
