import {
  Controller, Post, Get, UseGuards, Request, Response,
  Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as Req, Response as Res } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Request() req: Req, @Body() _: LoginDto, @Response({ passthrough: true }) res: Res) {
    const reqUser = req.user as { id: string; email: string; rol: string };
    const { accessToken, refreshToken } = await this.authService.login(reqUser);
    const user = await this.authService.me(reqUser.id);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
    return { access_token: accessToken, user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Renovar access token' })
  async refresh(@Request() req: Req, @Response({ passthrough: true }) res: Res) {
    const { accessToken, refreshToken } = await this.authService.refresh(req.user as any);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
    return { access_token: accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@Response({ passthrough: true }) res: Res) {
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
}
