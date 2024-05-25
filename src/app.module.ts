import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`src/config/env/.${process.env.NODE_ENV}.env`],
    }),
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
