import {
  Controller,
  Post,
  HttpCode,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Body } from '@nestjs/common/decorators';

import { AuthService } from 'src/auth/auth.service';
import { UserDto } from 'src/auth/dto/user.dto';

@ApiTags('Auth API')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '유저 Passport 생성예시 API',
    description: '',
  })
  @ApiBody({
    type: UserDto,
    required: true,
    description: '유저 정보',
    examples: {
      ExampleBodyData: {
        value: {
          userId: '1',
          role: 'teacher',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('passport')
  @HttpCode(200)
  async createLecture(@Body() body: UserDto) {
    try {
      return await this.authService.encodeUserPassport(body);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      } else {
        throw new InternalServerErrorException();
      }
    }
  }
}
