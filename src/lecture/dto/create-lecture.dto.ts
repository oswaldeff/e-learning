import { IsNumber } from 'class-validator';

export class CreateLectureDto {
  @IsNumber()
  maxAttendees: number;
}
