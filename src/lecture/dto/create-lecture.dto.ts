import { IsNumber } from 'class-validator';

export class CreateLectureDto {
  @IsNumber()
  maxStudents: number;
}
