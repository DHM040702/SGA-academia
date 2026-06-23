import {
  Controller, Post, Get, UseGuards, Request, Response,
  Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as Req, Response as Res } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LoginThrottleGuard } from '../common/guards/login-throttle.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const COOKIE_OPTS = {
  httpOnly: true,
  // Secure debe ser true SOLO con HTTPS. El sistema corre sobre HTTP en la red
  // local, por lo que una cookie Secure NO se envía y la sesión se pierde al
  // recargar. Se controla con COOKIE_SECURE (default false). Poner en true
  // únicamente cuando se sirva por HTTPS/TLS.
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private throttle: LoginThrottleGuard,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottleGuard, AuthGuard('local'))
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Request() req: Req, @Body() _: LoginDto, @Response({ passthrough: true }) res: Res) {
    const reqUser = req.user as { id: string; email: string; rol: string };
    const { accessToken, refreshToken } = await this.authService.login(reqUser);
    const user = await this.authService.me(reqUser.id);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
    // Login exitoso → limpiar contador de intentos
    this.throttle.reset(req);
    return { access_token: accessToken, user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Renovar access token' })
  async refresh(@Request() req: Req, @Response({ passthrough: true }) res: Res) {
    const user = req.user as { id: string; email: string; rol: string; rawToken: string };
    const { accessToken, refreshToken } = await this.authService.refresh(user, user.rawToken);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
    return { access_token: accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Cerrar sesión — revoca todos los refresh tokens' })
  async logout(@Request() req: Req, @Response({ passthrough: true }) res: Res) {
    const user = req.user as { id: string };
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Sesión cerrada' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Usuario actual' })
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.me(user.id);
  }

  @Post('cambiar-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cambiar la propia contraseña (obligatorio al primer ingreso)' })
  async cambiarPassword(
    @CurrentUser() user: { id: string },
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.authService.cambiarPassword(user.id, dto.actual, dto.nueva);
  }
}
