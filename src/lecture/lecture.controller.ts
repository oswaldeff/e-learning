import {
  Controller,
  Post,
  HttpCode,
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

import { LectureService } from 'src/lecture/lecture.service';
import { CreateLectureDto } from 'src/lecture/dto/create-lecture.dto';

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
        'dXNlcjE6dGVhY2hlcg==.3580de51660fbe275925b8c754cc1da11f5b455be8e6c00e9b173aa839852d18',
    },
  })
  @ApiBody({
    type: CreateLectureDto,
    required: true,
    description: '최대 참석 가능 수강생 인원',
    examples: {
      ExampleBodyData: {
        value: {
          maxAttendees: 50,
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
  async createLecture(
    @Headers('X-USER-ID') userIdHeader: string,
    @Body() body: CreateLectureDto,
  ) {
    try {
      const { maxAttendees } = body;

      const { userId, role } =
        await this.lectureService.decodeUserHeader(userIdHeader);

      return await this.lectureService.createLecture(
        userId,
        role,
        maxAttendees,
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
        'dXNlcjE6dGVhY2hlcg==.3580de51660fbe275925b8c754cc1da11f5b455be8e6c00e9b173aa839852d18',
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
  async deleteLecture(
    @Headers('X-USER-ID') userIdHeader: string,
    @Headers('X-ROOM-ID') roomIdHeader: string,
  ) {
    try {
      const { userId, role } =
        await this.lectureService.decodeUserHeader(userIdHeader);

      const { lectureId } =
        await this.lectureService.decodeRoomHeader(roomIdHeader);

      return await this.lectureService.deleteLecture(userId, role, +lectureId);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      } else {
        throw new InternalServerErrorException();
      }
    }
  }
}
