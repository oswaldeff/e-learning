import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LectureModel } from 'src/lecture/entity/lecture.entity';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import Redlock from 'redlock';

@Injectable()
export class LectureService {
  private redlock: Redlock;

  constructor(
    @InjectRepository(LectureModel)
    private lectureRepository: Repository<LectureModel>,
    @InjectRedis() private readonly redis: Redis,
  ) {}
}
