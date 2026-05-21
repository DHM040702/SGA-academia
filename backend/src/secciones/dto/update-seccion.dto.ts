import { PartialType } from '@nestjs/swagger';
import { CreateAulaDto } from './create-seccion.dto';

export class UpdateAulaDto extends PartialType(CreateAulaDto) {}
