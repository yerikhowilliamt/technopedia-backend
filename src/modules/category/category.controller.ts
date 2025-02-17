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
import { Logger } from 'winston';
import { CategoryService } from './category.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import WebResponse, { Paging } from '../../model/web.model';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import {
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../model/category.model';
import { Auth } from 'src/common/auth/auth.decorator';
import { User } from '@prisma/client';

@Controller('stores/:storeId/categories')
export class CategoryController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private categoryService: CategoryService,
  ) {}

  private toCategoryResponse<T>(
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
    this.logger.error('Unhandled error occurred', { error: error.message, stack: error.stack });
    throw error;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: CreateCategoryRequest,
  ): Promise<WebResponse<CategoryResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      action: 'CREATE',
      timestamp: new Date().toISOString(),
    };

    try {
      request.storeId = storeId;

      if (!request.storeId) {
        throw new BadRequestException('Store ID are required.');
      }

      this.logger.warn(
        `CATEGORY CONTROLLER | CREATE: {user_id: ${JSON.stringify(user.id)}, store_id: ${JSON.stringify(storeId)}}`,
      );

      const result = await this.categoryService.create(user, request);

      this.logger.info('Category created successfully', {
        ...logData,
        categoryId: result.id,
      });

      return this.toCategoryResponse(result, 201);
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
  ): Promise<WebResponse<CategoryResponse[]>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      action: 'LIST',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!storeId) {
        throw new BadRequestException('Store ID are required.');
      }

      const result = await this.categoryService.list(
        user,
        storeId,
        page,
        limit,
      );

      this.logger.info('Category retrieved successfully', {
        ...logData,
        totalItems: result.paging?.size,
      });

      return this.toCategoryResponse(result.data, 200, result.paging);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':categoryId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<WebResponse<CategoryResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      categoryId: categoryId,
      action: 'GET',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!storeId || !categoryId) {
        throw new BadRequestException('Category ID and Store ID are required.');
      }

      const result = await this.categoryService.get(
        user,
        storeId,
        categoryId
      );

      this.logger.info('Category details retrieved', logData);

      return this.toCategoryResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':categoryId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() request: UpdateCategoryRequest,
  ): Promise<WebResponse<CategoryResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      categoryId: categoryId,
      action: 'UPDATE',
      timestamp: new Date().toISOString(),
    };

    try {
      request.id = categoryId;
      request.storeId = storeId;

      if (!request.id || !request.storeId) {
        throw new BadRequestException('Category ID and Store ID are required.');
      }

      const result = await this.categoryService.update(user, request);

      this.logger.info('Category updated successfully', {
        ...logData,
        updatedCategoryId: result.id,
      });

      return this.toCategoryResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':categoryId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      categoryId: categoryId,
      action: 'DELETE',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!categoryId || !storeId) {
        throw new BadRequestException('Category ID and Store ID are required.');
      }

      const result = await this.categoryService.delete(
        user,
        storeId,
        categoryId,
      );

      this.logger.info({
        ...logData,
        success: result.success,
        message: result.message
      });

      return this.toCategoryResponse(
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
