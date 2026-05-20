import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana.ramirez@unasam.edu.pe' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '••••••••' })
  @IsString()
  @MinLength(6)
  password: string;
}
