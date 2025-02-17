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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ImageService } from './image.service';
import WebResponse, { Paging } from '../../model/web.model';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import {
  CreateImageRequest,
  ImageResponse,
  UpdateImageRequest,
} from '../../model/image.model';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('stores/:storeId/products/:productId/images')
export class ImageController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private imageService: ImageService,
  ) {}

  private toImageResponse<T>(
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

  // Endpoint to upload multiple images for a product
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images'))
  async upload(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() request: CreateImageRequest,
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<WebResponse<ImageResponse[]>> {
    request.productId = productId;

    // Log incoming request
    const logData = {
      userId: user.id,
      storeId: storeId,
      productId: productId,
      action: 'CREATE',
      timestamp: new Date().toISOString(),
    };

    try {
      // Validate and process the request
      if (!productId || !storeId) {
        throw new BadRequestException('Product ID and Store ID are required.');
      }

      // Call service to handle image upload and save them to the database
      const result = await this.imageService.uploadImages(request, images);

      this.logger.info('Image created successfully', {
        ...logData,
        imageId: result.map((result) => result.id),
      });

      return this.toImageResponse(result, 201);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Endpoint to get all image
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ): Promise<WebResponse<ImageResponse[]>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      action: 'LIST',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!storeId && !productId) {
        throw new BadRequestException('Store ID and Product ID are required.');
      }

      const result = await this.imageService.list(productId, page, limit);

      this.logger.info('Image retrieved successfully', {
        ...logData,
        totalItems: result.paging?.size,
      });

      return this.toImageResponse(result.data, 200, result.paging);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Endpoint to get image by ID
  @Get(':imageId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<WebResponse<ImageResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      productId: productId,
      imageId: imageId,
      action: 'GET',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!storeId || !productId || !imageId) {
        throw new BadRequestException(
          'Image ID, Product ID, and Store ID are required.',
        );
      }

      const result = await this.imageService.getImageById(imageId, productId);

      this.logger.info('Image details retrieved', logData);

      return this.toImageResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Endpoint to update an image's details
  @Put(':imageId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() request: UpdateImageRequest,
    @Body('file') file: Express.Multer.File,
  ): Promise<WebResponse<ImageResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      productId: productId,
      imageId: imageId,
      action: 'UPDATE',
      timestamp: new Date().toISOString(),
    };

    try {
      request.id = imageId;
      request.productId = productId;

      if (!request.id || !request.productId) {
        throw new BadRequestException(
          'Image ID, Product ID, and Store ID are required.',
        );
      }

      const result = await this.imageService.updateImage(request, file);

      this.logger.info('Image updated successfully', {
        ...logData,
        updatedColorId: result.id,
      });

      return this.toImageResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Endpoint to delete an image by ID
  @Delete(':imageId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      productId: productId,
      imageId: imageId,
      action: 'DELETE',
      timestamp: new Date().toISOString(),
    };

    try {
      if (!imageId || !storeId || !productId) {
        throw new BadRequestException(
          'Image ID, Product ID, and Store ID are required.',
        );
      }

      const result = await this.imageService.deleteImage(imageId, productId);

      this.logger.info({
        ...logData,
        success: result.success,
        message: result.message,
      });

      return this.toImageResponse(
        { message: result.message, success: result.success },
        200,
      );
    } catch (error) {
      this.handleError(error);
    }
  }
}
