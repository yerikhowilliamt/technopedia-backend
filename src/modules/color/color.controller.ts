import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ColorService } from './color.service';
import WebResponse, { Paging } from '../../model/web.model';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import {
  ColorResponse,
  CreateColorRequest,
  UpdateColorRequest,
} from '../../model/color.model';

@Controller('stores/:storeId/colors')
export class ColorController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private colorService: ColorService,
  ) {}

  private toColorResponse<T>(
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
    if (
      error instanceof UnauthorizedException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw error;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: CreateColorRequest,
  ): Promise<WebResponse<ColorResponse>> {
    try {
      request.storeId = storeId;

      if (!request.storeId) {
        throw new BadRequestException('Store ID are required.');
      }

      this.logger.warn(
        `COLOR CONTROLLER | CREATE: {user_id: ${JSON.stringify(user.id)}, store_id: ${JSON.stringify(storeId)}}`,
      );

      const result = await this.colorService.create(user, request);

      return this.toColorResponse(result, 201);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ): Promise<WebResponse<ColorResponse[]>> {
    try {
      if (!storeId) {
        throw new BadRequestException('Store ID are required.');
      }

      const result = await this.colorService.list(user, storeId, page, limit);

      return this.toColorResponse(result.data, 200, result.paging);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':colorId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
  ): Promise<WebResponse<ColorResponse>> {
    try {
      if (!storeId || !colorId) {
        throw new BadRequestException('Color ID and Store ID are required.');
      }

      const result = await this.colorService.get(user, storeId, colorId);

      return this.toColorResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':colorId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
    @Body() request: UpdateColorRequest,
  ): Promise<WebResponse<ColorResponse>> {
    try {
      request.id = colorId;
      request.storeId = storeId;

      if (!request.id || !request.storeId) {
        throw new BadRequestException('Color ID and Store ID are required.');
      }

      const result = await this.colorService.update(user, request);

      return this.toColorResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':colorId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    try {
      if (!colorId || !storeId) {
        throw new BadRequestException('Color ID and Store ID are required.');
      }

      const result = await this.colorService.delete(user, storeId, colorId);

      return this.toColorResponse(
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
