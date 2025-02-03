import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
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
import WebResponse, { Paging } from '../../model/web.model';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local.guard';
import { GoogleAuthGuard } from './guards/google.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private authService: AuthService,
  ) {}

  private toAuthResponse<T>(
    data: T,
    statusCode: number,
    paging?: Paging,
  ): WebResponse<T> {
    return {
      data,
      statusCode,
      timestamp: new Date().toString(),
      ...(paging ? { paging } : {}),
    };
  }

  @Post('register')
  async register(
    @Body() request: RegisterUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    try {
      const result = await this.authService.register(request);

      return this.toAuthResponse(result, 201);
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
  async googleAuthRedirect(@Req() req, @Res() res: Response): Promise<void> {
    try {
      const { user } = req;
      if (!user)
        throw new UnauthorizedException('Google authentication failed');

      const userId = user.id;
      const currentUser = await this.authService.findUserById(userId);
      const accessToken = currentUser.accessToken;

      res
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000, // 1 hari
        })
        .redirect('http://localhost:3000');
    } catch (error) {
      console.error('Error during Google OAuth redirect:', error);
      throw new UnauthorizedException('Authentication failed');
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

      return this.toAuthResponse(result, 200);
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res() res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.json({ message: 'Logout successful' });
  }
}
