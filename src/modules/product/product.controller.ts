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
  UseInterceptors,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ProductService } from './product.service';
import WebResponse, { Paging } from '../../model/web.model';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from 'src/common/auth/auth.decorator';
import { User } from '@prisma/client';
import {
  CreateProductRequest,
  ProductResponse,
  UpdateProductRequest,
} from 'src/model/product.model';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('stores/:storeId/categories/:categoryId/colors/:colorId/products')
export class ProductController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private productService: ProductService,
  ) {}

  private toProductResponse<T>(
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
  @UseInterceptors(FileInterceptor('files'))
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
    @Body() request: CreateProductRequest,
  ): Promise<WebResponse<ProductResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      categoryId: categoryId,
      colorId: colorId,
      action: 'CREATE',
      timestamp: new Date().toISOString(),
    };

    try {
      request.storeId = storeId;
      request.categoryId = categoryId;
      request.colorId = colorId;

      if (!request.storeId) {
        throw new BadRequestException('Store ID are required.');
      }

      this.logger.warn(
        `PRODUCT CONTROLLER | CREATE: {user_id: ${JSON.stringify(user.id)}, store_id: ${JSON.stringify(storeId)}}`,
      );

      const result = await this.productService.create(user, request);

      this.logger.info('Product created successfully', {
        ...logData,
        productId: result.id,
      });

      return this.toProductResponse(result, 201);
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
  ): Promise<WebResponse<ProductResponse[]>> {
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

      const result = await this.productService.list(user, storeId, page, limit);

      this.logger.info('Product retrieved successfully', {
        ...logData,
        totalItems: result.paging?.size,
      });

      return this.toProductResponse(result.data, 200, result.paging);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':productId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
  ): Promise<WebResponse<ProductResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      categoryId: categoryId,
      colorId: colorId,
      productId: productId,
      action: 'GET',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!storeId && !colorId) {
        throw new BadRequestException('Color ID and Store ID are required.');
      }

      const result = await this.productService.get(
        user,
        storeId,
        categoryId,
        colorId,
        productId,
      );

      this.logger.info('Product details retrieved', logData);

      return this.toProductResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':productId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
    @Body() request: UpdateProductRequest,
  ): Promise<WebResponse<ProductResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      categoryId: categoryId,
      colorId: colorId,
      productId: productId,
      action: 'UPDATE',
      timestamp: new Date().toISOString(),
    };

    try {
      request.id = productId;
      request.storeId = storeId;
      request.categoryId = categoryId;
      request.colorId = colorId;

      if (
        !request.id &&
        !request.storeId &&
        !request.categoryId &&
        !request.colorId
      ) {
        throw new BadRequestException(
          'Product ID, Store ID, CategoryID, and Color ID are required.',
        );
      }

      const result = await this.productService.update(user, request);

      this.logger.info('Product updated successfully', {
        ...logData,
        updatedProductId: result.id,
      });

      return this.toProductResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      categoryId: categoryId,
      colorId: colorId,
      productId: productId,
      action: 'DELETE',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!productId && !storeId && !categoryId && !colorId) {
        throw new BadRequestException(
          'Product ID, Store ID, CategoryID, and Color ID are required.',
        );
      }

      const result = await this.productService.delete(
        user,
        storeId,
        categoryId,
        colorId,
        productId,
      );

      this.logger.info({
        ...logData,
        success: result.success,
        message: result.message,
      });

      return this.toProductResponse(
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
