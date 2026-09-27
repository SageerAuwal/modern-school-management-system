import 'reflect-metadata';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      const { NestFactory } = require('@nestjs/core');
      const { ExpressAdapter } = require('@nestjs/platform-express');
      const { ValidationPipe } = require('@nestjs/common');
      const express = require('express');
      const cookieParser = require('cookie-parser');
      const { AppModule } = require('../src/app.module');

      const expressApp = express();
      const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
        rawBody: true,
        logger: false,
      });

      app.use(cookieParser());
      app.enableCors({
        origin: (origin: any, callback: any) => callback(null, true),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      });

      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
      );

      app.setGlobalPrefix('api/v1', { exclude: ['/', 'health'] });
      await app.init();
      cachedApp = expressApp;
    }

    return cachedApp(req, res);
  } catch (err: any) {
    console.error('[API Serverless Error]:', err);
    return res.status(500).json({
      error: 'ServerlessBootstrapError',
      message: err?.message,
      stack: err?.stack,
    });
  }
}
