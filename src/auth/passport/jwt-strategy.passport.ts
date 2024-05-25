// NOTE npm
import { Injectable, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';

import { JWTPayload } from 'src/auth/interface/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: configService.get<string>('JWT_SECRET_KEY'),
    });
  }

  async validate(payload: JWTPayload, done: VerifiedCallback): Promise<any> {
    if (payload.isRefreshToken) {
      return done(
        new UnauthorizedException({
          message: 'Refresh token cannot be used',
          statusCode: HttpStatus.UNAUTHORIZED,
        }),
        false,
      );
    }
    return done(null, payload);
  }
}
