import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects routes requiring a valid JWT access token.
 * Token is read from the httpOnly 'access_token' cookie.
 * Apply to any route or controller that requires authentication.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
