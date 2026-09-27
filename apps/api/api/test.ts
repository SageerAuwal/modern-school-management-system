export default async function handler(req: any, res: any) {
  let step = 'start';
  try {
    step = 'reflect-metadata';
    require('reflect-metadata');

    step = 'prisma client load';
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    step = 'nest core load';
    const { NestFactory } = require('@nestjs/core');
    const { ExpressAdapter } = require('@nestjs/platform-express');
    const express = require('express');

    step = 'app module load';
    const { AppModule } = require('../src/app.module');

    step = 'create nest app';
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      logger: false,
    });

    step = 'init nest app';
    await app.init();

    res.status(200).json({
      status: 'ok',
      message: 'NestJS initialized successfully on Vercel!',
      nodeVersion: process.version,
    });
  } catch (err: any) {
    res.status(500).json({
      failedAtStep: step,
      error: err?.message,
      stack: err?.stack,
    });
  }
}
