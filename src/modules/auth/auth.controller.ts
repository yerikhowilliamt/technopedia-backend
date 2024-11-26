import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  LoginUserRequest,
  RegisterUserRequest,
  UserResponse,
} from '../../model/user.model';
import WebResponse from '../../model/web.model';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local.guard';
import { GoogleAuthGuard } from './guards/google.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() request: RegisterUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    try {
      const result = await this.authService.register(request);
      return {
        data: result,
        statusCode: 201,
        timestamp: new Date().toString(),
      };
    } catch (error) {
      this.logger.error('Registration failed', error);
      throw error;
    }
  }

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    return {
      message: 'Google Authentication - Redirecting...',
    };
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req) {
    try {
      const { user } = req;

      if (!user) {
        this.logger.warn('Google OAuth redirect failed: No user data');
        throw new UnauthorizedException('Google authentication failed');
      }

      const userId = user.id
      const currentUser = await this.authService.findUserById(userId);
  
      return {
        message: 'Google Account Information',
        user: currentUser,
      };

    } catch (error) {
      this.logger.error('Error during Google OAuth redirect', error);

      throw error;
    }
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  async login(
    @Body() request: LoginUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    try {
      const result = await this.authService.login(request);
      return {
        data: result,
        statusCode: 200,
        timestamp: new Date().toString(),
      };
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }
}
