import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { Response } from 'express';

const BCRYPT_ROUNDS = 12;
const COOKIE_OPTIONS = {
  httpOnly: true,       // Never readable by JavaScript
  secure: true,         // HTTPS only in production
  sameSite: 'lax' as const,
  path: '/',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  // ── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, res: Response, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { school: { select: { id: true, name: true } } },
    });

    // Always compare hashes even if user not found — prevents timing attacks
    const dummyHash = '$2b$12$dummyhashtopreventtimingattacksonnonexistentemails';
    const hashToCheck = user?.passwordHash ?? dummyHash;
    const isValid = await bcrypt.compare(dto.password, hashToCheck);

    if (!user || !isValid || !user.isActive) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        targetType: 'USER',
        metadata: { email: dto.email, ip: ipAddress, reason: !user ? 'USER_NOT_FOUND' : !isValid ? 'WRONG_PASSWORD' : 'ACCOUNT_INACTIVE' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // If MFA is enabled, issue a short-lived pre-auth token instead
    if (user.mfaEnabled) {
      const preAuthToken = this.jwtService.sign(
        { sub: user.id, mfaPending: true },
        {
          secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
          expiresIn: '5m',
        },
      );
      return { mfaRequired: true, preAuthToken };
    }

    await this.issueTokens(user.id, user.email, user.role, user.schoolId, res);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      metadata: { ip: ipAddress },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        school: user.school,
      },
    };
  }

  // ── MFA Verification ─────────────────────────────────────────────────────

  async verifyMfa(
    preAuthToken: string,
    totpToken: string,
    res: Response,
    ipAddress?: string,
  ) {
    let payload: { sub: string; mfaPending: boolean };
    try {
      payload = this.jwtService.verify(preAuthToken, {
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired pre-auth token');
    }

    if (!payload.mfaPending) {
      throw new UnauthorizedException('Invalid pre-auth token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user?.mfaSecret) {
      throw new UnauthorizedException('MFA not configured');
    }

    const isValid = otplib.verify({ token: totpToken, secret: user.mfaSecret });
    if (!isValid) {
      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: 'MFA_VERIFY_FAILED',
        targetType: 'USER',
        targetId: user.id,
        metadata: { ip: ipAddress },
      });
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.issueTokens(user.id, user.email, user.role, user.schoolId, res);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_SUCCESS_MFA',
      targetType: 'USER',
      targetId: user.id,
      metadata: { ip: ipAddress },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // ── MFA Setup ────────────────────────────────────────────────────────────

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const secret = otplib.generateSecret();
    const otpAuthUrl = otplib.generateURI({
      issuer: 'School Management System',
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Store secret temporarily — only confirmed after user verifies
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: false },
    });

    return { secret, qrCodeDataUrl };
  }

  async confirmMfa(userId: string, totpToken: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }
    const isValid = otplib.verify({ token: totpToken, secret: user.mfaSecret });
    if (!isValid) {
      throw new BadRequestException('Invalid MFA code — please try again');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
    await this.auditService.log({
      actorId: userId,
      actorEmail: user.email,
      action: 'MFA_ENABLED',
      targetType: 'USER',
      targetId: userId,
    });
    return { message: 'MFA enabled successfully' };
  }

  // ── Refresh Token ─────────────────────────────────────────────────────────

  async refresh(
    userId: string,
    email: string,
    role: string,
    schoolId: string,
    refreshTokenId: string,
    res: Response,
  ) {
    // Revoke the used refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: { revokedAt: new Date() },
    });
    await this.issueTokens(userId, email, role, schoolId, res);
    return { message: 'Tokens refreshed' };
  }

  // ── Set Password (invite flow) ────────────────────────────────────────────

  async setPassword(dto: SetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (!dto.inviteToken) {
      throw new BadRequestException('Invite token required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        inviteToken: dto.inviteToken,
        inviteExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired invite link');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpiry: null,
        isActive: true,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'PASSWORD_SET',
      targetType: 'USER',
      targetId: user.id,
    });

    return { message: 'Password set successfully. You can now log in.' };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string, res: Response) {
    // Revoke all refresh tokens for this user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Clear both cookies
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);

    return { message: 'Logged out successfully' };
  }

  // ── Internal: Issue Tokens ────────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    schoolId: string,
    res: Response,
  ) {
    const payload: JwtPayload = { sub: userId, email, role, schoolId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });

    // Hash the refresh token before storing — never store plaintext tokens
    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    // Set tokens in httpOnly cookies — never accessible to JavaScript
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      secure: isProduction,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
