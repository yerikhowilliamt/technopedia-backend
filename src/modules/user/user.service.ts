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

  async get(user: User): Promise<UserResponse> {
    try {
      this.logger.info(
        `USER SERVICE | GET : { User with email: ${user.email} }`,
      );

      const currentUser = await this.prismaService.user.findUnique({
        where: {
          email: user.email,
        },
      });

      const accessToken = currentUser.accessToken;

      if (!currentUser) {
        throw new UnauthorizedException('User not found');
      }

      if (!accessToken) {
        throw new UnauthorizedException('Token must be provided');
      }

      return this.toUserResponse(currentUser);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      
      throw new InternalServerErrorException(error);
    }
  }

  async update(
    user: User,
    request: UpdateUserRequest,
    file?: Express.Multer.File,
  ): Promise<UserResponse> {
    try {
      this.logger.info(
        `USER SERVICE | User: ${JSON.stringify(user.email)} trying to update their profile`,
      );

      const updateRequest: UpdateUserRequest =
        await this.validationService.validate(UserValidation.UPDATE, request);

      const existingUser = await this.prismaService.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const updatedUserData: Partial<User> = {};

      if (updateRequest.name) updatedUserData.name = updateRequest.name;
      if (updateRequest.password)
        updatedUserData.password = await bcrypt.hash(
          updateRequest.password,
          10,
        );
      if (updateRequest.role) updatedUserData.role = updateRequest.role;

      if (file) {
        try {
          const uploadResult = await this.uploadService.uploadImage(file);

          if (uploadResult) {
            updatedUserData.image = uploadResult.secure_url;
            this.logger.info(`Uploaded image: ${updatedUserData.image}`);
          } else {
            throw new InternalServerErrorException(
              'Failed to upload image to Cloudinary',
            );
          }
        } catch (error) {
          this.logger.error(
            `Error uploading image to Cloudinary: ${error.message}`,
            error.stack,
          );
          throw new InternalServerErrorException(
            'Failed to upload image to Cloudinary',
          );
        }
      }

      const updatedUser = await this.prismaService.user.update({
        where: { email: user.email },
        data: updatedUserData,
      });

      return this.toUserResponse(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error updating user profile:', error);
      throw new InternalServerErrorException(error);
    }
  }

  async logout(user: User): Promise<{ message: string; success: boolean }> {
    try {
      await this.prismaService.user.update({
        where: {
          email: user.email,
        },
        data: {
          accessToken: null,
        },
      });

      this.logger.info(
        `USER SERVICE | LOGOUT : User with email: ${user.email} has logged out successfully.`,
      );

      return {
        message: 'Log out successful',
        success: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
