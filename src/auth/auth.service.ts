import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import { JWTPayload } from 'src/auth/interface/jwt-payload.interface';
import { UserDto } from 'src/auth/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async signToken(payload: JWTPayload): Promise<string> {
    const signOptions = {
      expiresIn: payload.isRefreshToken
        ? this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME')
        : this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
    };
    const token = this.jwtService.signAsync(payload, signOptions);
    return token;
  }

  async encodeUserPassport(payload: UserDto): Promise<string> {
    const { userId, role } = payload;
    const encodedData = Buffer.from(`${userId}:${role}`).toString('base64');
    const hmacSecretKey = this.configService.get<string>('HMAC_SECRET_KEY');
    const signature = crypto
      .createHmac('sha256', hmacSecretKey)
      .update(encodedData)
      .digest('hex');
    const userIdHeader = `${encodedData}.${signature}`;
    return userIdHeader;
  }
}
