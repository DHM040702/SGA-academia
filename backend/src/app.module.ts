import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { MinioModule } from './minio/minio.module';
import { AuthModule } from './auth/auth.module';
import { AlumnosModule } from './alumnos/alumnos.module';
import { DocentesModule } from './docentes/docentes.module';
import { ApoderadosModule } from './apoderados/apoderados.module';
import { CiclosModule } from './ciclos/ciclos.module';
import { SeccionesModule } from './secciones/secciones.module';
import { CursosModule } from './cursos/cursos.module';
import { HorariosModule } from './horarios/horarios.module';
import { RecesosModule } from './recesos/recesos.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { ComunicadosModule } from './comunicados/comunicados.module';
import { BibliotecaModule } from './biblioteca/biblioteca.module';
import { ReportesModule } from './reportes/reportes.module';
import { CarrerasModule } from './carreras/carreras.module';
import { TurnosModule } from './turnos/turnos.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { SalidasModule } from './salidas/salidas.module';
import { FotosControlModule } from './fotos-control/fotos-control.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MinioModule,
    AuthModule,
    CarrerasModule,
    TurnosModule,
    UsuariosModule,
    AlumnosModule,
    DocentesModule,
    ApoderadosModule,
    CiclosModule,
    SeccionesModule,
    CursosModule,
    HorariosModule,
    RecesosModule,
    AsistenciaModule,
    ComunicadosModule,
    BibliotecaModule,
    ReportesModule,
    AuditoriaModule,
    SalidasModule,
    FotosControlModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
