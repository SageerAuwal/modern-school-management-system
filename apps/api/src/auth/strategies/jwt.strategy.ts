import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: string;
  schoolId: string;
}

/**
 * JwtStrategy — validates the access token from the httpOnly cookie.
 * Tokens are stored in cookies (never localStorage) per the tech spec.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Extract JWT from httpOnly cookie named 'access_token'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Fetch fresh user on every request — ensures deactivated accounts
    // are rejected immediately without waiting for token expiry.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
        isActive: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or deactivated');
    }

    return user;
  }
}
