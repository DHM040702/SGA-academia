import { PartialType } from '@nestjs/swagger';
import { CreateCicloDto } from './create-ciclo.dto';

export class UpdateCicloDto extends PartialType(CreateCicloDto) {}
