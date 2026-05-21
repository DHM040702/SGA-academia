import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AlumnosModule } from './alumnos/alumnos.module';
import { DocentesModule } from './docentes/docentes.module';
import { CiclosModule } from './ciclos/ciclos.module';
import { SeccionesModule } from './secciones/secciones.module';
import { CursosModule } from './cursos/cursos.module';
import { HorariosModule } from './horarios/horarios.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { ComunicadosModule } from './comunicados/comunicados.module';
import { BibliotecaModule } from './biblioteca/biblioteca.module';
import { ReportesModule } from './reportes/reportes.module';
import { CarrerasModule } from './carreras/carreras.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CarrerasModule,
    AlumnosModule,
    DocentesModule,
    CiclosModule,
    SeccionesModule,
    CursosModule,
    HorariosModule,
    AsistenciaModule,
    ComunicadosModule,
    BibliotecaModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
