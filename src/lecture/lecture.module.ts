import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { LectureModel } from 'src/lecture/entity/lecture.entity';
import { LectureService } from 'src/lecture/lecture.service';
import { LectureController } from 'src/lecture/lecture.controller';
import { StudentModel } from 'src/lecture/entity/student.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LectureModel, StudentModel]),
    RedisModule,
  ],
  controllers: [LectureController],
  providers: [LectureService],
})
export class LectureModule {}
