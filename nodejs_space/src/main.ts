import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Request, Response, NextFunction } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Serve dashboard static files
  const dashboardPath = join(__dirname, '..', 'public', 'dashboard');
  
  // Serve _next assets from root (needed for Next.js)
  app.useStaticAssets(join(dashboardPath, '_next'), {
    prefix: '/_next',
  });
  
  // Serve dashboard pages
  app.useStaticAssets(dashboardPath, {
    prefix: '/dashboard',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const swaggerPath = 'api-docs';
  
  // Prevent CDN/browser caching of Swagger docs
  app.use(`/${swaggerPath}`, (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('DENTRA API')
    .setDescription(
      'Autonomous Dental Practice Intelligence Platform - Voice AI Backend Service',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerPath, app, document, {
    customSiteTitle: 'DENTRA API Documentation',
    customfavIcon: 'https://cdn-icons-png.flaticon.com/512/2977/2977285.png',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { 
        font-size: 32px; 
        color: #1a1a1a; 
        font-weight: 700;
      }
      .swagger-ui .info .description { 
        font-size: 16px; 
        color: #4a4a4a; 
        line-height: 1.6;
      }
      .swagger-ui .scheme-container { 
        background: #f8f9fa; 
        padding: 15px; 
        border-radius: 8px;
      }
      .swagger-ui .opblock { 
        border-radius: 8px; 
        border: 1px solid #e0e0e0; 
        margin: 15px 0;
      }
      .swagger-ui .opblock-summary { 
        padding: 15px; 
      }
      .swagger-ui .btn { 
        border-radius: 6px; 
      }
      .swagger-ui .opblock.opblock-get { 
        border-color: #61affe; 
        background: rgba(97, 175, 254, 0.05);
      }
      .swagger-ui .opblock.opblock-post { 
        border-color: #49cc90; 
        background: rgba(73, 204, 144, 0.05);
      }
    `,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 DENTRA Backend is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/${swaggerPath}`);
  logger.log(`🎨 Dashboard UI: http://localhost:${port}/dashboard/`);
}

bootstrap();
