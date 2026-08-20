import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtRefreshGuard — protects the /auth/refresh endpoint.
 * Validates the refresh token from the httpOnly 'refresh_token' cookie.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
