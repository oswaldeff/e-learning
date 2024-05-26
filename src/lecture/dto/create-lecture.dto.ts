import { IsNumber, IsString } from 'class-validator';

import { LectureStatusType } from 'src/lecture/entity/lecture.entity';

export class CreateLectureDto {
  @IsNumber()
  maxStudents: number;

  @IsString()
  status: LectureStatusType;
}
