import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { UpdateUserRequest, UserResponse } from '../../model/user.model';
import { Logger } from 'winston';
import { UserValidation } from './user.validation';
import { User } from '@prisma/client';
import { FileUploadService } from '../../common/file-upload.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private uploadService: FileUploadService,
  ) {}

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      createdAt: user.createdAt.toString(),
      updatedAt: user.updatedAt.toString(),
    };
  }

  private handleError(error: any): never {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    if (error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error('Internal Server Error:', error);
    throw new InternalServerErrorException(error);
  }

  async get(user: User): Promise<UserResponse> {
    try {
      this.logger.info(`USER SERVICE | GET : User with email: ${user.email}`);

      const currentUser = await this.prismaService.user.findUnique({
        where: { email: user.email },
      });

      if (!currentUser) {
        throw new UnauthorizedException('User not found');
      }

      if (!currentUser.accessToken) {
        throw new UnauthorizedException('Token must be provided');
      }

      return this.toUserResponse(currentUser);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateUserRequest,
    file?: Express.Multer.File,
  ): Promise<UserResponse> {
    try {
      this.logger.info(
        `USER SERVICE | UPDATE : User ${user.email} trying to update their profile`,
      );

      const updateRequest = await this.validationService.validate(
        UserValidation.UPDATE,
        request,
      );

      const existingUser = await this.prismaService.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const updatedUserData: Partial<User> = await this.UpdatedUserData(
        updateRequest,
        file,
      );

      const updatedUser = await this.prismaService.user.update({
        where: { email: user.email },
        data: updatedUserData,
      });

      return this.toUserResponse(updatedUser);
    } catch (error) {
      this.handleError(error);
    }
  }

  private async UpdatedUserData(
    updateRequest: UpdateUserRequest,
    file?: Express.Multer.File,
  ): Promise<Partial<User>> {
    const updatedUserData: Partial<User> = {};

    if (updateRequest.name) updatedUserData.name = updateRequest.name;

    if (updateRequest.password) {
      updatedUserData.password = await bcrypt.hash(updateRequest.password, 10);
    }

    if (updateRequest.role) updatedUserData.role = updateRequest.role;

    if (file) {
      updatedUserData.image = await this.uploadImage(file);
    }

    return updatedUserData;
  }

  private async uploadImage(file: Express.Multer.File): Promise<string | null> {
    try {
      const uploadResult = await this.uploadService.uploadImage(file);
      if (uploadResult) {
        this.logger.info(`Uploaded image: ${uploadResult.secure_url}`);
        return uploadResult.secure_url;
      } else {
        throw new InternalServerErrorException(
          'Failed to upload image to Cloudinary',
        );
      }
    } catch (error) {
      this.logger.error(`Error uploading image: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Failed to upload image to Cloudinary',
      );
    }
  }

  async logout(user: User): Promise<{ message: string; success: boolean }> {
    try {
      await this.prismaService.user.update({
        where: { email: user.email },
        data: { accessToken: null },
      });

      this.logger.info(
        `USER SERVICE | LOGOUT : User with email: ${user.email} has logged out`,
      );

      return {
        message: 'Log out successful',
        success: true,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
