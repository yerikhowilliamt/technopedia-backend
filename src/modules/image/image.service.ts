import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Image, Product } from '@prisma/client';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { FileUploadService } from 'src/common/file-upload.service';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import {
  CreateImageRequest,
  ImageResponse,
  UpdateImageRequest,
} from 'src/model/image.model';
import { Logger } from 'winston';
import { ZodError } from 'zod';
import { ImageValidation } from './image.validation';

@Injectable()
export class ImageService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  private toImageResponse(image: Image): ImageResponse {
    return {
      id: image.id,
      productId: image.productId,
      url: image.url,
      createdAt: image.createdAt.toISOString(),
      updatedAt: image.updatedAt.toISOString(),
    };
  }

  // Generalized error handler
  private handleError(error: Error): never {
    if (error instanceof ZodError) {
      this.logger.error(`Validation error: ${error.message}`);
      throw new BadRequestException(error.message);
    } else if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      this.logger.error(`Request error: ${error.message}`);
      throw error;
    } else {
      this.logger.error(`Internal Server Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  // Helper function to check if product exists
  private async checkExistingProduct(productId: number): Promise<Product> {
    this.logger.info(`Checking existence of product with id: ${productId}`);
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product) {
      this.logger.warn(`Product with id ${productId} not found`);
      throw new NotFoundException('Product not found');
    }

    this.logger.info(`Product found: ${JSON.stringify(product)}`);
    return product;
  }

  // Helper to handle image upload and save URL to database
  private async uploadAndSaveImages(
    productId: number,
    files: Express.Multer.File[],
  ): Promise<ImageResponse[]> {
    this.logger.info(
      `Uploading ${files.length} files for productId: ${productId}`,
    );

    const uploadResults = await this.fileUploadService.uploadImages(files);

    const images = await Promise.all(
      uploadResults.map(
        async (uploadResult: UploadApiResponse | UploadApiErrorResponse) => {
          if ('secure_url' in uploadResult) {
            this.logger.info(
              `Image uploaded successfully: ${uploadResult.secure_url}`,
            );
            const image = await this.prismaService.image.create({
              data: {
                productId,
                url: uploadResult.secure_url,
              },
            });
            return this.toImageResponse(image);
          }
          this.logger.error('Failed to upload one or more images');
          throw new Error('Failed to upload one or more images');
        },
      ),
    );

    return images;
  }

  // Upload multiple images for a product
  async uploadImages(
    request: CreateImageRequest,
    files: Express.Multer.File[],
  ): Promise<ImageResponse[]> {
    try {
      const createRequest = await this.validationService.validate(
        ImageValidation.CREATE,
        request,
      );
      const product = await this.checkExistingProduct(createRequest.productId);

      // Upload and save images
      return await this.uploadAndSaveImages(product.id, files);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Get image by ID
  async getImageById(
    imageId: number,
    productId: number,
  ): Promise<ImageResponse> {
    try {
      const product = await this.checkExistingProduct(productId);

      const image = await this.prismaService.image.findUnique({
        where: { id: imageId, productId: product.id },
      });

      if (!image) {
        this.logger.warn(`Image with ID ${imageId} not found`);
        throw new NotFoundException('Image not found');
      }

      this.logger.info(`Image found: ${JSON.stringify(image)}`);
      return this.toImageResponse(image);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Delete image by ID
  async deleteImage(
    imageId: number,
    productId: number,
  ): Promise<{ message: string; success: boolean }> {
    try {
      const product = await this.checkExistingProduct(productId);

      const image = await this.prismaService.image.findUnique({
        where: { id: imageId, productId: product.id },
      });

      if (!image) {
        this.logger.warn(`Image with ID ${imageId} not found`);
        throw new NotFoundException('Image not found');
      }

      this.logger.info(
        `Deleting image with ID ${imageId} and URL: ${image.url}`,
      );

      // Optional: Delete from Cloudinary
      // await v2.uploader.destroy(image.public_id);

      await this.prismaService.image.delete({
        where: { id: imageId },
      });

      this.logger.info(`Image with ID ${imageId} deleted successfully`);

      return { message: 'Image deleted successfully', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  // Update image URL
  async updateImage(
    request: UpdateImageRequest,
    file?: Express.Multer.File,
  ): Promise<ImageResponse> {
    try {
      const updateRequest = await this.validationService.validate(
        ImageValidation.UPDATE,
        request,
      );

      const product = await this.checkExistingProduct(updateRequest.productId);

      const image = await this.prismaService.image.findUnique({
        where: { id: updateRequest.id, productId: product.id },
      });

      if (!image) {
        this.logger.warn(`Image with ID ${updateRequest.id} not found`);
        throw new NotFoundException('Image not found');
      }

      this.logger.info(`Image to update: ${JSON.stringify(image)}`);

      let uploadResult: UploadApiResponse | UploadApiErrorResponse | null =
        null;

      if (file) {
        this.logger.info(
          `Uploading new image for productId: ${updateRequest.productId}`,
        );
        uploadResult = await this.fileUploadService.uploadImage(file);
        if ('secure_url' in uploadResult) {
          this.logger.info(
            `New image uploaded successfully: ${uploadResult.secure_url}`,
          );
          await this.prismaService.image.update({
            where: { id: updateRequest.id },
            data: {
              productId: product.id,
              url: uploadResult.secure_url,
            },
          });
        }
      } else {
        this.logger.info(
          `No file uploaded. Updating only productId for image ID ${updateRequest.id}`,
        );
        await this.prismaService.image.update({
          where: { id: updateRequest.id },
          data: {
            productId: product.id,
          },
        });
      }

      this.logger.info(
        `Image with ID ${updateRequest.id} updated successfully`,
      );
      return this.toImageResponse(
        await this.prismaService.image.findUnique({
          where: { id: updateRequest.id },
        }),
      );
    } catch (error) {
      this.handleError(error);
    }
  }
}
