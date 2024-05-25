// NOTE npm
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// NOTE module
import { JWTPayload } from './interface/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // FUNCTION 토큰발급
  async signToken(payload: JWTPayload): Promise<string> {
    const signOptions = {
      expiresIn: payload.isRefreshToken
        ? this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME')
        : this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
    };
    const token = this.jwtService.signAsync(payload, signOptions);
    return token;
  }
}
