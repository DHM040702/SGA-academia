import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsUrl, MinLength } from 'class-validator';
import { TipoRecurso } from '@prisma/client';

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

  @ApiProperty({
    description: 'URL del recurso (MinIO path o URL externa)',
    example: 'https://storage.example.com/archivo.pdf',
  })
  @IsString()
  @MinLength(1)
  url: string;

  @ApiPropertyOptional({ description: 'Nivel académico (ej. 5to secundaria)' })
  @IsOptional()
  @IsString()
  nivel?: string;

  @ApiPropertyOptional({ description: 'UUID del curso asociado', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  curso_id?: string;
}
