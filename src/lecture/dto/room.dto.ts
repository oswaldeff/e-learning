import { IsString } from 'class-validator';

export class RoomDto {
  @IsString()
  lectureId: string;

  @IsString()
  maxAttendees: string;

  @IsString()
  lectureSecretCode: string;
}
