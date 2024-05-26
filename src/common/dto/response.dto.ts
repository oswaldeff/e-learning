import { HttpStatus } from '@nestjs/common';

export class ResponseDto {
  message: string;
  data?: object;
  statusCode: HttpStatus;
}
