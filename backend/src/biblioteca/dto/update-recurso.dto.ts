import { PartialType } from '@nestjs/swagger';
import { CreateRecursoDto } from './create-recurso.dto';

export class UpdateRecursoDto extends PartialType(CreateRecursoDto) {}
