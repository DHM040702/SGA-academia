import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateApoderadoDto {
  @ApiPropertyOptional({ example: 'María' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez Gómez' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  apellidos?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  telefono_whatsapp?: string;
}
