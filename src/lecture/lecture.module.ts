import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { LectureModel } from 'src/lecture/entity/lecture.entity';
import { LectureService } from 'src/lecture/lecture.service';
import { LectureController } from 'src/lecture/lecture.controller';
import { AttendModel } from 'src/lecture/entity/attend.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureModel, AttendModel]), RedisModule],
  controllers: [LectureController],
  providers: [LectureService],
})
export class LectureModule {}
