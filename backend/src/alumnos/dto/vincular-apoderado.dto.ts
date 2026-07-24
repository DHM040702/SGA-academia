import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional,
  IsString, IsUUID, Matches, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Datos para crear un apoderado nuevo al momento de vincularlo */
export class NuevoApoderadoInlineDto {
  @ApiProperty() @IsString() @MinLength(2)
  nombre: string;

  @ApiProperty() @IsString() @MinLength(2)
  apellidos: string;

  @ApiProperty({ example: '76543210', description: 'DNI de 8 dígitos' })
  @Matches(/^\d{8}$/, { message: 'DNI debe tener 8 dígitos' })
  dni: string;

  @ApiProperty({ example: '+51943221887' })
  @IsString()
  @MinLength(7)
  telefono_whatsapp: string;

  @ApiPropertyOptional({
    description: 'Email de acceso del apoderado. Opcional: si se omite se autogenera.',
    example: 'papa.garcia@gmail.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Temporal1234!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

/** DTO para vincular (o crear + vincular) un apoderado a un alumno */
export class VincularApoderadoDto {
  @ApiProperty({ enum: ['nuevo', 'existente'] })
  @IsEnum(['nuevo', 'existente'])
  accion: 'nuevo' | 'existente';

  /** Datos del apoderado a crear (requerido cuando accion = 'nuevo') */
  @ApiPropertyOptional({ type: NuevoApoderadoInlineDto })
  @ValidateIf((o) => o.accion === 'nuevo')
  @ValidateNested()
  @Type(() => NuevoApoderadoInlineDto)
  nuevo?: NuevoApoderadoInlineDto;

  /** ID del apoderado ya registrado (requerido cuando accion = 'existente') */
  @ApiPropertyOptional({ description: 'UUID del apoderado existente' })
  @ValidateIf((o) => o.accion === 'existente')
  @IsUUID()
  apoderado_id?: string;

  @ApiProperty({ example: 'padre', description: 'Relación familiar: padre, madre, tutor, abuelo, tío, otro' })
  @IsString()
  @IsNotEmpty()
  parentesco: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  es_principal?: boolean;
}
