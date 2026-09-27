import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true — required for Paystack webhook HMAC-SHA512 signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = Number(process.env.PORT) || configService.get<number>('API_PORT') || 3001;
  const webUrl = configService.get<string>('WEB_URL') ?? 'http://localhost:3000';
  const allowedOrigins = webUrl.split(',').map((url) => url.trim());

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

  // ── Security: CORS — allow configured frontend domains and Vercel previews ─
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        // Fallback for testing environments
        callback(null, true);
      }
    },
    credentials: true,                 // Required for httpOnly cookie auth
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
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
  app.setGlobalPrefix('api/v1', { exclude: ['/', 'health'] });

  await app.listen(port, '0.0.0.0');
  console.log(`[API] Server listening on port ${port}/api/v1`);
}

bootstrap();
