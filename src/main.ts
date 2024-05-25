import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
} from '@nestjs/swagger';

import { AppModule } from 'src/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigService>(ConfigService);

  // NOTE 실행환경 분리
  switch (process.env.NODE_ENV) {
    case 'prod':
      app.enableCors({
        origin: configService.get<string>('CORS_ORIGIN'),
        credentials: true,
        exposedHeaders: ['X-USER-ID', 'X-ROOM-ID'],
      });
      break;

    default:
      app.enableCors({
        origin: configService.get<string>('CORS_ORIGIN'),
        credentials: false,
        exposedHeaders: ['X-USER-ID', 'X-ROOM-ID'],
      });

      const swaggerCustomOptions: SwaggerCustomOptions = {
        swaggerOptions: {
          persistAuthorization: true,
        },
      };
      const swaggerDocumentBuilder = new DocumentBuilder()
        .setTitle('E-LEARNING API')
        .setDescription('e-learning course reservation service')
        .setVersion('0.1')
        .build();
      const swaggerDocument = SwaggerModule.createDocument(
        app,
        swaggerDocumentBuilder,
      );
      SwaggerModule.setup(
        'swagger/docs',
        app,
        swaggerDocument,
        swaggerCustomOptions,
      );
      break;
  }
  await app.listen(+configService.get<number>('SERVER_PORT'));
}
bootstrap();
