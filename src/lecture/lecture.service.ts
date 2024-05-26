import {
  Injectable,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { LectureModel } from 'src/lecture/entity/lecture.entity';
import { ResponseDto } from 'src/common/dto/response.dto';
import { UserDto } from 'src/auth/dto/user.dto';
import { RoomDto } from 'src/lecture/dto/room.dto';
import { StudentModel } from 'src/lecture/entity/student.entity';

@Injectable()
export class LectureService {
  constructor(
    @InjectRedis() private readonly redisClient: Redis,
    private readonly configService: ConfigService,
    @InjectRepository(LectureModel)
    private readonly lectureRepository: Repository<LectureModel>,
    @InjectRepository(StudentModel)
    private readonly studentRepository: Repository<StudentModel>,
    private dataSource: DataSource,
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
    transactionManager: EntityManager,
    userId: number,
    role: string,
    maxAttendees: number,
  ): Promise<ResponseDto> {
    if (role !== 'teacher') {
      throw new UnauthorizedException();
    }

    const existingLecture = await transactionManager.findOne(LectureModel, {
      where: { teacherId: userId },
    });
    if (existingLecture) {
      throw new BadRequestException();
    }

    const lectureSecretCode = crypto.randomUUID().slice(0, 5);
    const lectureObject = this.lectureRepository.create({
      maxAttendees: maxAttendees,
      teacherId: +userId,
      lectureSecretCode: lectureSecretCode,
    });
    const newLecture = await transactionManager.save(
      LectureModel,
      lectureObject,
    );

    const redisChannel = `lecture:${newLecture.lectureId}:maxAttendees`;
    try {
      await this.redisClient.set(`${redisChannel}`, maxAttendees.toString());

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
    } catch (e) {
      await this.redisClient.del(`${redisChannel}`);
      throw e;
    }
  }

  async decodeRoomHeader(roomIdHeader: string): Promise<RoomDto> {
    const [encodedData, providedSignature] = roomIdHeader.split('.');
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
    const [lectureId, maxAttendees, lectureSecretCode] = decodedData.split(':');
    if (!lectureId || !maxAttendees || !lectureSecretCode) {
      throw new UnauthorizedException();
    }
    const roomDto = { lectureId, maxAttendees, lectureSecretCode };
    return roomDto;
  }

  async deleteLecture(
    transactionManager: EntityManager,
    userId: number,
    role: string,
    lectureId: number,
  ): Promise<ResponseDto> {
    if (role !== 'teacher') {
      throw new UnauthorizedException();
    }

    const existingLecture = await transactionManager.findOne(LectureModel, {
      where: { lectureId: lectureId, teacherId: userId },
    });
    if (!existingLecture) {
      throw new NotFoundException();
    }

    const redisChannel = `lecture:${lectureId}:maxAttendees`;
    await this.redisClient.del(`${redisChannel}`);

    await transactionManager.delete(LectureModel, { lectureId: lectureId });

    const response: ResponseDto = {
      message: 'Success',
      statusCode: HttpStatus.OK,
    };
    return response;
  }
}
