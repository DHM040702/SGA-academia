import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCursoDto {
  @ApiProperty({ example: 'Matemáticas', description: 'Nombre completo del curso' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({
    example: 'MAT',
    description: 'Código único del curso (solo letras mayúsculas, máx. 10 caracteres)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'El código debe contener solo letras mayúsculas, números, guiones o guiones bajos',
  })
  codigo: string;
}
