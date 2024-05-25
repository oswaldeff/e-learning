import {
  Injectable,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { LectureModel } from 'src/lecture/entity/lecture.entity';
import { ResponseDto } from 'src/common/dto/response.dto';
import { UserDto } from 'src/lecture/dto/user.dto';

@Injectable()
export class LectureService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(LectureModel)
    private readonly lectureRepository: Repository<LectureModel>,
    private readonly configService: ConfigService,
  ) {}

  async encodeUserPassport(userDto): Promise<string> {
    const { userId, role } = userDto;
    const encodedData = Buffer.from(`${userId}:${role}`).toString('base64');
    const hmacSecretKey = this.configService.get<string>('HMAC_SECRET_KEY');
    const signature = crypto
      .createHmac('sha256', hmacSecretKey)
      .update(encodedData)
      .digest('hex');
    const userIdHeader = `${encodedData}.${signature}`;
    return userIdHeader;
  }

  async decodeUserHeader(userIdHeader: string): Promise<UserDto> {
    const [encodedData, providedSignature] = userIdHeader.split('.');
    if (!encodedData || !providedSignature) {
      throw new UnauthorizedException();
    }

    const hmacSecretKey = this.configService.get<string>('HMAC_SECRET_KEY');
    const expectedSignature = crypto
      .createHmac('sha256', hmacSecretKey)
      .update(encodedData)
      .digest('hex');
    if (providedSignature !== expectedSignature) {
      throw new UnauthorizedException();
    }

    const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
    const [userId, role] = decodedData.split(':');
    if (!userId || !role) {
      throw new UnauthorizedException();
    }
    const userDto = { userId, role };
    return userDto;
  }

  async createLecture(
    userId: string,
    role: string,
    maxAttendees: number,
  ): Promise<ResponseDto> {
    if (role !== 'teacher') {
      throw new UnauthorizedException();
    }

    const existingLecture = await this.lectureRepository.findOne({
      where: { teacherId: userId },
    });
    if (existingLecture) {
      throw new BadRequestException();
    }

    const lectureSecretCode = crypto.randomUUID().slice(0, 5);
    const lecture = this.lectureRepository.create({
      maxAttendees: maxAttendees,
      teacherId: userId,
      lectureSecretCode: lectureSecretCode,
    });
    await this.lectureRepository.save(lecture);

    const responseData = { lectureSecretCode };
    const response: ResponseDto = {
      message: 'Success',
      data: responseData,
      statusCode: HttpStatus.CREATED,
    };
    return response;
  }
}
