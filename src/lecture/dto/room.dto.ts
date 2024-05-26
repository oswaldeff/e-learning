import { IsString } from 'class-validator';

export class RoomDto {
  @IsString()
  lectureId: string;

  @IsString()
  maxStudents: string;

  @IsString()
  lectureSecretCode: string;
}
