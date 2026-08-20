import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

/**
 * JwtRefreshStrategy — validates the refresh token from httpOnly cookie.
 * Implements refresh token rotation: each refresh token is stored hashed
 * in DB and invalidated after use. Using a token twice signals theft.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const rawToken = req.cookies?.['refresh_token'];
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // Find a valid (non-revoked, non-expired) refresh token for this user
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    // Compare raw token against stored hashes (rotation detection)
    let matchedToken = null;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(rawToken, stored.tokenHash);
      if (isMatch) {
        matchedToken = stored;
        break;
      }
    }

    if (!matchedToken) {
      // Token not found or already used — possible theft, revoke ALL tokens
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Invalid refresh token. All sessions have been revoked.',
      );
    }

    return { ...payload, refreshTokenId: matchedToken.id };
  }
}
