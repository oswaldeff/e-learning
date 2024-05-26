import { IsString } from 'class-validator';

export class AttendLectureDto {
  @IsString()
  lectureSecretCode: string;
}
