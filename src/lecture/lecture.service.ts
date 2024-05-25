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
import { UserDto } from 'src/auth/dto/user.dto';
import { RoomDto } from 'src/lecture/dto/room.dto';

@Injectable()
export class LectureService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(LectureModel)
    private readonly lectureRepository: Repository<LectureModel>,
    private readonly configService: ConfigService,
  ) {}

  async encodeRoomPassport(payload: RoomDto): Promise<string> {
    const { lectureId, maxAttendees, lectureSecretCode } = payload;
    const encodedData = Buffer.from(
      `${lectureId}:${maxAttendees}:${lectureSecretCode}`,
    ).toString('base64');
    const hmacSecretKey = this.configService.get<string>('HMAC_SECRET_KEY');
    const signature = crypto
      .createHmac('sha256', hmacSecretKey)
      .update(encodedData)
      .digest('hex');
    const roomIdHeader = `${encodedData}.${signature}`;
    return roomIdHeader;
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
    const newLecture = await this.lectureRepository.save(lecture);
    const roomDto = {
      lectureId: newLecture.lectureId.toString(),
      maxAttendees: newLecture.maxAttendees.toString(),
      lectureSecretCode: newLecture.lectureSecretCode,
    };
    const roomId = await this.encodeRoomPassport(roomDto);

    const responseData = { lectureSecretCode, roomId };
    const response: ResponseDto = {
      message: 'Success',
      data: responseData,
      statusCode: HttpStatus.CREATED,
    };
    return response;
  }
}
