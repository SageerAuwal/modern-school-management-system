import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Stricter rate limit: 5 attempts per 15 minutes per IP
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? req.socket.remoteAddress;
    return this.authService.login(dto, res, ip);
  }

  /**
   * POST /api/v1/auth/mfa/verify
   * Complete login after MFA code verification
   */
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async verifyMfa(
    @Body() dto: VerifyMfaDto,
    @Body('preAuthToken') preAuthToken: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? req.socket.remoteAddress;
    return this.authService.verifyMfa(preAuthToken, dto.token, res, ip);
  }

  /**
   * GET /api/v1/auth/mfa/setup
   * Generate MFA secret and QR code (requires authentication)
   */
  @Get('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@CurrentUser() user: { id: string }) {
    return this.authService.setupMfa(user.id);
  }

  /**
   * POST /api/v1/auth/mfa/confirm
   * Confirm MFA setup by verifying first TOTP code
   */
  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmMfa(
    @CurrentUser() user: { id: string },
    @Body() dto: VerifyMfaDto,
  ) {
    return this.authService.confirmMfa(user.id, dto.token);
  }

  /**
   * POST /api/v1/auth/refresh
   * Rotate refresh token and issue new access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @CurrentUser()
    user: {
      sub: string;
      email: string;
      role: string;
      schoolId: string;
      refreshTokenId: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(
      user.sub,
      user.email,
      user.role,
      user.schoolId,
      user.refreshTokenId,
      res,
    );
  }

  /**
   * POST /api/v1/auth/set-password
   * First-login password set via invite token
   */
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto);
  }

  /**
   * POST /api/v1/auth/logout
   * Clears cookies and revokes all refresh tokens
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user.id, res);
  }

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: object) {
    return user;
  }
}
