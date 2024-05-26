import { IsNumber } from 'class-validator';

export class DeleteLectureDto {
  @IsNumber()
  maxAttendees: number;
}
