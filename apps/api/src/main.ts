import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT') ?? 3001;
  const webUrl = configService.get<string>('WEB_URL') ?? 'http://localhost:3000';

  // ── Cookie parser — required to read httpOnly cookies for JWT auth ──────
  app.use(cookieParser());

  // ── Security: Helmet (CSP, HSTS, X-Frame-Options, etc.) ────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // ── Security: CORS — only allow the web frontend ───────────────────────────
  app.enableCors({
    origin: webUrl,
    credentials: true,                 // Required for httpOnly cookie auth
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Security: Global validation pipe ───────────────────────────────────────
  // Rejects any request body that doesn't match the DTO shape.
  // whitelist: strips unknown properties silently.
  // forbidNonWhitelisted: rejects requests with unknown properties.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,                 // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── API prefix ─────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}

bootstrap();
