import {
  Controller,
  Post,
  Get,
  HttpCode,
  UseInterceptors,
  Headers,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Body } from '@nestjs/common/decorators';
import { EntityManager } from 'typeorm';

import { LectureService } from 'src/lecture/lecture.service';
import { CreateLectureDto } from 'src/lecture/dto/create-lecture.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { TransactionManager } from 'src/common/decorator/transaction.decorator';
import { AttendLectureDto } from 'src/lecture/dto/attend-lecture.dto';

@ApiTags('Lecture API')
@Controller('lecture')
export class LectureController {
  constructor(private readonly lectureService: LectureService) {}

  @ApiOperation({
    summary: '강의장 개설 API',
    description: '',
  })
  @ApiHeader({
    name: 'X-USER-ID',
    description: '유저 Passport',
    required: true,
    schema: {
      type: 'string',
      example:
        'MTp0ZWFjaGVy.e9efcd325dc314431ac1f02d249f8c51db33856834a25436dd789ae960d1c4ec',
    },
  })
  @ApiBody({
    type: CreateLectureDto,
    required: true,
    description: '최대 참석 가능 수강생 인원',
    examples: {
      ExampleBodyData: {
        value: {
          maxStudents: 50,
          status: 'activated',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('open')
  @HttpCode(201)
  @UseInterceptors(TransactionInterceptor)
  async createLecture(
    @TransactionManager() transactionManager: EntityManager,
    @Headers('X-USER-ID') userIdHeader: string,
    @Body() body: CreateLectureDto,
  ) {
    try {
      const { maxStudents, status } = body;

      const { userId, role } =
        await this.lectureService.decodeUserHeader(userIdHeader);

      return await this.lectureService.createLecture(
        transactionManager,
        +userId,
        role,
        maxStudents,
        status,
      );
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  @ApiOperation({
    summary: '강의장 종료 API',
    description: '',
  })
  @ApiHeader({
    name: 'X-USER-ID',
    description: '유저 Passport',
    required: true,
    schema: {
      type: 'string',
      example:
        'MTp0ZWFjaGVy.e9efcd325dc314431ac1f02d249f8c51db33856834a25436dd789ae960d1c4ec',
    },
  })
  @ApiHeader({
    name: 'X-ROOM-ID',
    description: '강의장 Passport',
    required: true,
    schema: {
      type: 'string',
      example:
        'NTo1MDpkYWZmZg==.a2056f5e18d5fa975634f7960ae3a24f6ee4dba747eaaf89eeab7ff963406400',
    },
  })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('close')
  @HttpCode(200)
  @UseInterceptors(TransactionInterceptor)
  async deleteLecture(
    @TransactionManager() transactionManager: EntityManager,
    @Headers('X-USER-ID') userIdHeader: string,
    @Headers('X-ROOM-ID') roomIdHeader: string,
  ) {
    try {
      const { userId, role } =
        await this.lectureService.decodeUserHeader(userIdHeader);

      const { lectureId } =
        await this.lectureService.decodeRoomHeader(roomIdHeader);

      return await this.lectureService.deleteLecture(
        transactionManager,
        +userId,
        role,
        +lectureId,
      );
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  @ApiOperation({
    summary: '강의장 참석 API',
    description: '',
  })
  @ApiHeader({
    name: 'X-USER-ID',
    description: '유저 Passport',
    required: true,
    schema: {
      type: 'string',
      example:
        'MTp0ZWFjaGVy.e9efcd325dc314431ac1f02d249f8c51db33856834a25436dd789ae960d1c4ec',
    },
  })
  @ApiBody({
    type: AttendLectureDto,
    required: true,
    description: '강의코드',
    examples: {
      ExampleBodyData: {
        value: {
          lectureSecretCode: '2af61',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Resource already exists' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('attend')
  @HttpCode(201)
  @UseInterceptors(TransactionInterceptor)
  async attendLecture(
    @TransactionManager() transactionManager: EntityManager,
    @Headers('X-USER-ID') userIdHeader: string,
    @Body() body: AttendLectureDto,
  ) {
    try {
      const { lectureSecretCode } = body;

      const { userId } =
        await this.lectureService.decodeUserHeader(userIdHeader);

      return await this.lectureService.attendLecture(
        transactionManager,
        +userId,
        lectureSecretCode,
      );
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  @ApiOperation({
    summary: '강의장 조회 API',
    description: '',
  })
  @ApiHeader({
    name: 'X-USER-ID',
    description: '유저 Passport',
    required: true,
    schema: {
      type: 'string',
      example:
        'MTp0ZWFjaGVy.e9efcd325dc314431ac1f02d249f8c51db33856834a25436dd789ae960d1c4ec',
    },
  })
  @ApiHeader({
    name: 'X-ROOM-ID',
    description: '강의장 Passport',
    required: true,
    schema: {
      type: 'string',
      example:
        'NTo1MDpkYWZmZg==.a2056f5e18d5fa975634f7960ae3a24f6ee4dba747eaaf89eeab7ff963406400',
    },
  })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('informations')
  @HttpCode(200)
  async getLectureInformations(
    @Headers('X-USER-ID') userIdHeader: string,
    @Headers('X-ROOM-ID') roomIdHeader: string,
  ) {
    try {
      await this.lectureService.decodeUserHeader(userIdHeader);

      const { lectureId } =
        await this.lectureService.decodeRoomHeader(roomIdHeader);

      return await this.lectureService.getLectureInformations(+lectureId);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      } else {
        throw new InternalServerErrorException();
      }
    }
  }
}
