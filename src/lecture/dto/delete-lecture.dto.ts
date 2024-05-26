import { IsNumber } from 'class-validator';

export class DeleteLectureDto {
  @IsNumber()
  maxStudents: number;
}
