import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

let cachedServer: Express;

async function bootstrap(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  try {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      rawBody: true,
      logger: ['error', 'warn', 'log'],
    });

    const configService = app.get(ConfigService);
    const webUrl =
      configService.get<string>('WEB_URL') ??
      process.env.WEB_URL ??
      'http://localhost:3000';
    const allowedOrigins = webUrl.split(',').map((url) => url.trim());

    app.use(cookieParser());

    app.use(
      helmet({
        contentSecurityPolicy: false,
      }),
    );

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('api/v1', { exclude: ['/', 'health'] });

    await app.init();
    cachedServer = expressApp;
    return cachedServer;
  } catch (error: any) {
    console.error('[BOOTSTRAP FATAL ERROR]', error);
    const fallbackApp = express();
    fallbackApp.all('*', (req, res) => {
      res.status(500).json({
        statusCode: 500,
        error: 'BootstrapInitializationError',
        message: error?.message || 'NestJS bootstrap failed',
        details: error?.stack || String(error),
      });
    });
    return fallbackApp;
  }
}

// Local server mode when not executing as a Vercel serverless function
if (!process.env.VERCEL) {
  bootstrap().then((server) => {
    const port = Number(process.env.PORT) || 3001;
    server.listen(port, '0.0.0.0', () => {
      console.log(`[API] Server listening on port ${port}/api/v1`);
    });
  });
}

// Export default handler for Vercel Serverless Function runtime
export default async function handler(req: any, res: any) {
  const server = await bootstrap();
  return server(req, res);
}
