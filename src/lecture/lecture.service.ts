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
import { AttendModel } from 'src/lecture/entity/attend.entity';

@Injectable()
export class LectureService {
  constructor(
    @InjectRedis() private readonly redisClient: Redis,
    private readonly configService: ConfigService,
    @InjectRepository(LectureModel)
    private readonly lectureRepository: Repository<LectureModel>,
    @InjectRepository(AttendModel)
    private readonly attendRepository: Repository<AttendModel>,
    private dataSource: DataSource,
  ) {}

  async encodeRoomPassport(payload: RoomDto): Promise<string> {
    const { lectureId, maxStudents, lectureSecretCode } = payload;
    const encodedData = Buffer.from(
      `${lectureId}:${maxStudents}:${lectureSecretCode}`,
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
    maxStudents: number,
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
      maxStudents: maxStudents,
      teacherId: +userId,
      lectureSecretCode: lectureSecretCode,
    });
    const newLecture = await transactionManager.save(
      LectureModel,
      lectureObject,
    );

    const capacityKey = `lecture:${newLecture.lectureId}:capacity`;
    try {
      await this.redisClient.set(`${capacityKey}`, maxStudents.toString());

      const roomDto = {
        lectureId: newLecture.lectureId.toString(),
        maxStudents: newLecture.maxStudents.toString(),
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
      await this.redisClient.del(`${capacityKey}`);
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
    const [lectureId, maxStudents, lectureSecretCode] = decodedData.split(':');
    if (!lectureId || !maxStudents || !lectureSecretCode) {
      throw new UnauthorizedException();
    }
    const roomDto = { lectureId, maxStudents, lectureSecretCode };
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

    const capacityKey = `lecture:${lectureId}:capacity`;
    await this.redisClient.del(`${capacityKey}`);

    await transactionManager.delete(LectureModel, { lectureId: lectureId });

    const response: ResponseDto = {
      message: 'Success',
      statusCode: HttpStatus.OK,
    };
    return response;
  }

  private async acquireLock(
    resource: string,
    ttl: number,
    retryDelay: number,
    maxRetries: number,
  ): Promise<boolean> {
    const redisChannel = `lock:${resource}`;

    const lockValue = crypto.randomBytes(16).toString('hex');
    const lockKey = `lock:${resource}`;
    let retries = 0;

    while (retries < maxRetries) {
      const acquired = await this.redisClient.set(
        lockKey,
        lockValue,
        'PX',
        ttl,
        'NX',
      );

      if (acquired === 'OK') {
        return true;
      }

      retries += 1;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    const listener = (message: string) => {
      if (message === lockValue) {
        this.redisClient.unsubscribe(redisChannel);
      }
    };

    await this.redisClient.subscribe(redisChannel);
    this.redisClient.on('message', listener);

    return new Promise<boolean>((resolve) => {
      setTimeout(async () => {
        await this.redisClient.unsubscribe(redisChannel);
        this.redisClient.removeListener('message', listener);
        resolve(false);
      }, ttl);
    });
  }

  private async releaseLock(resource: string): Promise<void> {
    const redisChannel = `lock:${resource}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        redis.call("publish", KEYS[2], ARGV[1])
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redisClient.eval(
      script,
      2,
      `lock:${resource}`,
      redisChannel,
      resource,
    );
  }

  async attendLecture(
    transactionManager: EntityManager,
    userId: number,
    lectureSecretCode: string,
  ): Promise<ResponseDto> {
    const existingLecture = await transactionManager.findOne(LectureModel, {
      where: { lectureSecretCode: lectureSecretCode },
    });
    if (!existingLecture) {
      throw new NotFoundException();
    }

    const existingAttend = await transactionManager.findOne(AttendModel, {
      where: { lectureId: existingLecture.lectureId, studentId: userId },
    });
    if (existingAttend) {
      return {
        message: 'Resource already exists',
        data: { attendId: existingAttend.attendId },
        statusCode: HttpStatus.CONFLICT,
      };
    }

    const resource = `lecture:${existingLecture.lectureId}`;
    const ttl = +this.configService.get<number>('REDIS_LOCK_TTL');
    const retryDelay = +this.configService.get<number>('REDIS_RETRY_DELAY');
    const maxRetries = +this.configService.get<number>('REDIS_MAX_RETRIES');

    const lockResult = await this.acquireLock(
      resource,
      ttl,
      retryDelay,
      maxRetries,
    );

    if (!lockResult) {
      throw new BadRequestException();
    }

    try {
      const capacityKey = `lecture:${existingLecture.lectureId}:capacity`;
      const remainingCapacity = await this.redisClient.decr(capacityKey);

      if (remainingCapacity < 0) {
        await this.redisClient.incr(capacityKey);
        throw new BadRequestException();
      }

      const attendObject = this.attendRepository.create({
        studentId: userId,
        lectureId: existingLecture.lectureId,
      });
      await transactionManager.save(attendObject);

      const response: ResponseDto = {
        message: 'Success',
        statusCode: HttpStatus.CREATED,
      };
      return response;
    } finally {
      await this.releaseLock(resource);
    }
  }
}
