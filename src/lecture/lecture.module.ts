import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureModel } from 'src/lecture/entity/lecture.entity';
import { LectureService } from 'src/lecture/lecture.service';
import { LectureController } from 'src/lecture/lecture.controller';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [TypeOrmModule.forFeature([LectureModel]), RedisModule],
  controllers: [LectureController],
  providers: [LectureService],
})
export class LectureModule {}
