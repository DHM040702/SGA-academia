import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Convierte los errores conocidos de Prisma en respuestas HTTP limpias en lugar
 * de un 500 genérico. Cubre los casos que hoy se escapaban de las validaciones
 * explícitas de los servicios (colisiones de campos @unique con registros
 * soft-deleted o de otro rol, y borrados bloqueados por llaves foráneas).
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        // Violación de restricción única.
        const target = exception.meta?.target;
        const campos = Array.isArray(target) ? target.join(', ') : String(target ?? '');
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: campos
            ? `Ya existe un registro con ese valor único (${campos}).`
            : 'Ya existe un registro con ese valor único.',
        });
      }
      case 'P2003':
        // Violación de llave foránea (p. ej. borrar algo referenciado).
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'No se puede completar la operación: el registro está referenciado por otros datos.',
        });
      case 'P2025':
        // Registro requerido no encontrado.
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Registro no encontrado.',
        });
      default:
        this.log.warn(`Prisma error no mapeado ${exception.code}: ${exception.message.split('\n').pop()}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'No se pudo procesar la operación (error de base de datos).',
        });
    }
  }
}
