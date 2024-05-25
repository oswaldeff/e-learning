// NOTE npm
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// NOTE module
import { JwtConfigService } from 'src/auth/jwt-config.service';
import { JwtStrategy } from 'src/auth/passport/jwt-strategy.passport';
import { AuthService } from 'src/auth/auth.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useClass: JwtConfigService,
    }),
  ],
  controllers: [],
  providers: [JwtStrategy, AuthService],
})
export class AuthModule {}
