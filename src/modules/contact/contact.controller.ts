import {
  Body,
  Controller,
  Delete,
  UnauthorizedException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { Auth } from '../../common/auth/auth.decorator';
import WebResponse, { Paging } from '../../model/web.model';
import {
  ContactResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '../../model/contact.model';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('users/:userId/contacts')
export class ContactController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private contactService: ContactService,
  ) {}

  private toContactResponse<T>(
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

  private handleError(error: Error): never {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    throw error;
  }

  private checkAuthorization(userId: number, user: User): void {
    if (user.id !== userId) {
      this.logger.info(
        `CONTACT CONTROLLER | CHECK AUTH: {user_id: ${JSON.stringify(userId)}}`,
      );
      throw new UnauthorizedException(
        `You are not authorized to access this user's contacts`,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateContactRequest,
  ): Promise<WebResponse<ContactResponse>> {
    try {
      request.userId = userId;

      this.checkAuthorization(userId, user);

      const result = await this.contactService.create(user, request);

      return this.toContactResponse(result, 200);
    } catch (error) {
      this.handleError(error);
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
      this.checkAuthorization(userId, user);

      const result = await this.contactService.get(user, contactId);

      return this.toContactResponse(result, 200);
    } catch (error) {
      this.handleError(error);
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

      this.checkAuthorization(userId, user);

      const result = await this.contactService.update(user, request);

      return this.toContactResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':contactId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    try {
      this.checkAuthorization(userId, user);

      const result = await this.contactService.delete(user, contactId);

      return this.toContactResponse(
        {
          message: result.message,
          success: result.success,
        },
        200,
      );
    } catch (error) {
      this.handleError(error);
    }
  }
}
