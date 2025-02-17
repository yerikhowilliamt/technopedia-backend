import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { Logger } from 'winston';
import {
  LoginUserRequest,
  RegisterUserRequest,
  UserResponse,
  ValidateUserRequest,
} from '../../model/user.model';
import { ValidationService } from '../../common/validation.service';
import * as bcrypt from 'bcryptjs';
import { AuthValidation } from './auth.validation';
import { ZodError } from 'zod';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private jwtService: JwtService,
  ) {}

  private async checkExistingUser(email: string) {
    try {
      const userExists = await this.prismaService.user.count({
        where: { email },
      });

      if (userExists) {
        this.logger.warn('Email already registered');
        throw new BadRequestException('This email is already registered.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error checking if email exists', { error });
      throw new InternalServerErrorException(error);
    }
  }

  private generateAccessToken(userId: number, email: string): string {
    return this.jwtService.sign({ id: userId, email }, { expiresIn: '2h' });
  }

  private generateRefreshToken(userId: number, email: string): string {
    return this.jwtService.sign({ id: userId, email }, { expiresIn: '30d' });
  }

  async validate(request: ValidateUserRequest) {
    console.log('Validate request:', request);
    try {
      this.logger.debug('Validating user request', { request });

      const validatedRequest = await this.validationService.validate(
        AuthValidation.VALIDATEUSER,
        request,
      );

      this.logger.debug('Validated request', { validatedRequest });

      let account = await this.findAccount(validatedRequest.providerAccountId);
      this.logger.debug('Found account', { account });

      if (!account) {
        await this.checkExistingUser(validatedRequest.email);
        this.logger.debug('Creating new account for user');

        account = await this.prismaService.account.create({
          data: {
            user: {
              create: {
                email: validatedRequest.email,
                name: validatedRequest.name,
                image: validatedRequest.image,
              },
            },
            accessToken: validatedRequest.accessToken,
            refreshToken: validatedRequest.refreshToken,
            provider: validatedRequest.provider,
            providerAccountId: validatedRequest.providerAccountId,
          },
        });
        this.logger.debug('New account created', { account });
      }

      const accessToken = this.generateAccessToken(
        account.userId,
        validatedRequest.email,
      );
      const refreshToken = this.generateRefreshToken(
        account.userId,
        validatedRequest.email,
      );
      this.logger.debug('Generated tokens', { accessToken, refreshToken });

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      await this.prismaService.user.update({
        where: { id: account.userId },
        data: { accessToken, refreshToken: hashedRefreshToken },
      });

      this.logger.debug('Updated user with tokens');

      return account;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        this.logger.error('Error during validation', { error });
        throw new InternalServerErrorException('Validation failed');
      }
    }
  }

  async findUserByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  async findUserById(userId: number): Promise<UserResponse> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        accessToken: user.accessToken,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(error);
    }
  }

  async findAccount(providerAccountId: string) {
    return this.prismaService.account.findUnique({
      where: { providerAccountId },
    });
  }

  async register(request: RegisterUserRequest): Promise<UserResponse> {
    try {
      this.logger.info('Creating new user', { email: request.email });

      const validatedRequest = await this.validationService.validate(
        AuthValidation.REGISTER,
        request,
      );

      await this.checkExistingUser(validatedRequest.email);

      const hashedPassword = await bcrypt.hash(validatedRequest.password, 10);
      validatedRequest.password = hashedPassword;

      const user = await this.prismaService.user.create({
        data: validatedRequest,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        this.logger.error('Error during registration', { error });
        throw new InternalServerErrorException(
          'Registration failed. Please try again.',
        );
      }
    }
  }

  async login(request: LoginUserRequest): Promise<UserResponse> {
    try {
      this.logger.info('User login attempt', { email: request.email });

      const validatedRequest = await this.validationService.validate(
        AuthValidation.LOGIN,
        request,
      );

      const user = await this.findUserByEmail(validatedRequest.email);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(
        validatedRequest.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const accessToken = this.generateAccessToken(user.id, user.email);
      const refreshToken = this.generateRefreshToken(user.id, user.email);

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      await this.prismaService.user.update({
        where: { email: user.email },
        data: { refreshToken: hashedRefreshToken },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        accessToken,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error('Error during login:', error);
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      } else if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      } else {
        this.logger.error('Error during login', { error });
        throw new InternalServerErrorException(
          'Login failed. Please try again.',
        );
      }
    }
  }
}
