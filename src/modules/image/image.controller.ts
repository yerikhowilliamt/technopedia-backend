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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ImageService } from './image.service';
import WebResponse, { Paging } from '../../model/web.model';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import {
  ImageResponse,
  CreateImageRequest,
  UpdateImageRequest,
} from '../../model/image.model';

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
  async upload(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() request: CreateImageRequest,
    @Body('files') files: Express.Multer.File[],
  ): Promise<WebResponse<ImageResponse[]>> {
    try {
      // Validate and process the request
      if (!productId || !storeId) {
        throw new BadRequestException('Product ID and Store ID are required.');
      }

      // Log incoming request
      this.logger.warn(
        `IMAGE CONTROLLER | UPLOAD: {user_id: ${JSON.stringify(user.id)}, store_id: ${JSON.stringify(storeId)}, product_id: ${JSON.stringify(productId)}}`,
      );

      // Call service to handle image upload and save them to the database
      const result = await this.imageService.uploadImages(request, files);

      return this.toImageResponse(result, 201);
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
    try {
      if (!storeId || !productId || !imageId) {
        throw new BadRequestException(
          'Image ID, Product ID, and Store ID are required.',
        );
      }

      const result = await this.imageService.getImageById(imageId, productId);

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
    try {
      request.id = imageId;
      request.productId = productId;

      if (!request.id || !request.productId) {
        throw new BadRequestException(
          'Image ID, Product ID, and Store ID are required.',
        );
      }

      const result = await this.imageService.updateImage(request, file);

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
    try {
      if (!imageId || !storeId || !productId) {
        throw new BadRequestException(
          'Image ID, Product ID, and Store ID are required.',
        );
      }

      const result = await this.imageService.deleteImage(imageId, productId);

      return this.toImageResponse(
        { message: result.message, success: result.success },
        200,
      );
    } catch (error) {
      this.handleError(error);
    }
  }
}
