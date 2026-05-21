import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { TipoDestinatario } from '@prisma/client';

export class CreateComunicadoDto {
  @ApiProperty({ description: 'Título del comunicado', minLength: 3 })
  @IsString()
  @MinLength(3)
  titulo: string;

  @ApiProperty({ description: 'Cuerpo / contenido del comunicado' })
  @IsString()
  @MinLength(1)
  cuerpo: string;

  @ApiPropertyOptional({ enum: TipoDestinatario, description: 'Tipo de destinatario', default: 'todos' })
  @IsOptional()
  @IsEnum(TipoDestinatario)
  destinatario_tipo?: TipoDestinatario;

  @ApiPropertyOptional({ description: 'UUID del aula (cuando destinatario_tipo = seccion)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  aula_id?: string;

  @ApiPropertyOptional({ description: 'Enviar por canal interno del sistema', default: true })
  @IsOptional()
  @IsBoolean()
  canal_sistema?: boolean;

  @ApiPropertyOptional({ description: 'Enviar por WhatsApp via Twilio', default: false })
  @IsOptional()
  @IsBoolean()
  canal_whatsapp?: boolean;

  @ApiPropertyOptional({ description: 'Publicar inmediatamente (establece publicadoAt = ahora)' })
  @IsOptional()
  @IsBoolean()
  publicar_ahora?: boolean;
}
