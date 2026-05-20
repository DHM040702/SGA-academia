import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  MinLength,
} from 'class-validator';
import { CanalComunicado, Rol } from '@prisma/client';

export class CreateComunicadoDto {
  @ApiProperty({ description: 'Título del comunicado', minLength: 3 })
  @IsString()
  @MinLength(3)
  titulo: string;

  @ApiProperty({ description: 'Contenido del comunicado' })
  @IsString()
  @MinLength(1)
  contenido: string;

  @ApiProperty({
    enum: CanalComunicado,
    isArray: true,
    description: 'Canales de distribución (al menos 1)',
    example: ['interno'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CanalComunicado, { each: true })
  canales: CanalComunicado[];

  @ApiProperty({
    enum: Rol,
    isArray: true,
    description: 'Roles de destino (al menos 1)',
    example: ['alumno', 'apoderado'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Rol, { each: true })
  roles_destino: Rol[];
}
