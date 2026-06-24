import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { TipoRecurso, Area } from '@prisma/client';

export class CreateRecursoDto {
  @ApiProperty({ description: 'Título del recurso', minLength: 2 })
  @IsString()
  @MinLength(2)
  titulo: string;

  @ApiPropertyOptional({ description: 'Descripción del recurso' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ enum: TipoRecurso, description: 'Tipo de recurso' })
  @IsEnum(TipoRecurso)
  tipo: TipoRecurso;

  @ApiPropertyOptional({
    description: 'URL del recurso. Obligatorio para video/enlace/iframe. Para pdf puede omitirse si se sube archivo.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  url?: string;

  @ApiPropertyOptional({ description: 'Nivel académico (ej. 5to secundaria)' })
  @IsOptional()
  @IsString()
  nivel?: string;

  @ApiPropertyOptional({ description: 'UUID del curso asociado', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  curso_id?: string;

  @ApiPropertyOptional({ enum: Area, description: 'Área de destino. Si se omite, el recurso es para todas las áreas.' })
  @IsOptional()
  @IsEnum(Area)
  area?: Area;
}
