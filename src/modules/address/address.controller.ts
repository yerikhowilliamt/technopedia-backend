import {
  Body,
  Controller,
  UnauthorizedException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Post,
  Put,
  Delete,
  Inject,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import {
  AddressResponse,
  CreateAddressRequest,
  UpdateAddressRequest,
} from '../../model/address.model';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import WebResponse, { Paging } from '../../model/web.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('users/:userId/addresses')
export class AddressController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private addressService: AddressService,
  ) {}

  private toAddressResponse<T>(
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
    this.logger.error(error.message, error.stack);
    throw error;
  }

  private checkAuthorization(userId: number, user: User): void {
    if (user.id !== userId) {
      this.logger.info(`Unauthorized access attempt: user_id ${userId}`);
      throw new UnauthorizedException(
        "You are not authorized to access this user's addresses",
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateAddressRequest,
  ): Promise<WebResponse<AddressResponse>> {
    try {
      this.checkAuthorization(userId, user);
      request.userId = userId;

      const result = await this.addressService.create(user, request);

      return this.toAddressResponse(result, 201);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 5,
  ): Promise<WebResponse<AddressResponse[]>> {
    try {
      this.checkAuthorization(userId, user);
      const result = await this.addressService.list(user, limit, page);

      return this.toAddressResponse(result.data, 200, result.paging);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('main')
  @UseGuards(JwtAuthGuard)
  async getPrimary(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<WebResponse<AddressResponse>> {
    try {
      this.checkAuthorization(userId, user);
      const result = await this.addressService.getPrimary(user);

      return this.toAddressResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':addressId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() request: UpdateAddressRequest,
  ): Promise<WebResponse<AddressResponse>> {
    try {
      this.checkAuthorization(userId, user);
      request.userId = userId;
      request.id = addressId;

      const result = await this.addressService.update(user, request);

      return this.toAddressResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':addressId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('addressId', ParseIntPipe) addressId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    try {
      this.checkAuthorization(userId, user);

      const result = await this.addressService.delete(user, addressId);

      return this.toAddressResponse(
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
