import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import WebResponse, { Paging } from '../../model/web.model';
import {
  CreateStoreRequest,
  StoreResponse,
  UpdateStoreRequest,
} from '../../model/store.model';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('users/:userId/stores')
export class StoreController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private storeService: StoreService,
  ) {}

  private toStoreResponse<T>(
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
        `STORE CONTROLLER | CHECK AUTH: {user_id: ${JSON.stringify(userId)}}`,
      );
      throw new UnauthorizedException(
        `You are not authorized to access this user's stores`,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateStoreRequest,
  ): Promise<WebResponse<StoreResponse>> {
    try {
      request.userId = userId;

      this.logger.warn(
        `STORE CONTROLLER | CREATE: {userId: ${JSON.stringify(userId)}}`,
      );

      this.checkAuthorization(userId, user);

      const result = await this.storeService.create(user, request);

      return this.toStoreResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':storeId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
  ): Promise<WebResponse<StoreResponse>> {
    try {
      user.id = userId;

      this.checkAuthorization(userId, user);

      const result = await this.storeService.get(user, storeId);

      return this.toStoreResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':storeId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: UpdateStoreRequest,
  ): Promise<WebResponse<StoreResponse>> {
    try {
      request.id = storeId;

      this.checkAuthorization(userId, user);

      const result = await this.storeService.update(user, request);

      return this.toStoreResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':storeId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    try {
      this.checkAuthorization(userId, user);

      const result = await this.storeService.delete(user, storeId);

      return this.toStoreResponse(
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
