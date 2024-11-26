import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { Auth } from '../../common/auth/auth.decorator';
import WebResponse from '../../model/web.model';
import {
  ContactResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '../../model/contact.model';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('users/:userId/contacts')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateContactRequest,
  ): Promise<WebResponse<ContactResponse>> {
    try {
      request.userId = userId;

      if (request.userId !== userId) {
        throw new ForbiddenException(
          `You are not authorized to view this user's addresses`,
        );
      }

      const result = await this.contactService.create(user, request);

      return {
        data: result,
        statusCode: 201,
        timestamp: new Date().toString(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':contactId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ): Promise<WebResponse<ContactResponse>> {
    try {
      if (user.id !== userId) {
        throw new ForbiddenException(
          `You are not authorized to view this user's addresses`,
        );
      }

      const result = await this.contactService.get(user, contactId);

      return {
        data: result,
        statusCode: 200,
        timestamp: new Date().toString(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(':contactId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() request: UpdateContactRequest,
  ): Promise<WebResponse<ContactResponse>> {
    try {
      request.id = contactId;

      if (user.id !== userId) {
        throw new ForbiddenException(
          `You are not authorized to view this user's addresses`,
        );
      }

      const result = await this.contactService.update(user, request);

      return {
        data: result,
        statusCode: 200,
        timestamp: new Date().toString(),
      };
    } catch (error) {}
  }

  @Delete(':contactId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    try {
      if (user.id !== userId) {
        throw new ForbiddenException(
          `You are not authorized to view this user's addresses`,
        );
      }

      const result = await this.contactService.delete(user, contactId);

      return {
        data: {
          message: result.message,
          success: result.success,
        },
        statusCode: 200,
        timestamp: new Date().toString(),
      };
    } catch (error) {
      throw error;
    }
  }
}
