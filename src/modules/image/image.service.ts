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
import { FileUploadService } from '../../common/file-upload.service';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import {
  CreateImageRequest,
  ImageResponse,
  UpdateImageRequest,
} from '../../model/image.model';
import { Logger } from 'winston';
import { ZodError } from 'zod';
import { ImageValidation } from './image.validation';
import WebResponse from 'src/model/web.model';

@Injectable()
export class ImageService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  private toImageResponse(images: Image[]): ImageResponse[] {
    return images.map((image) => ({
      id: image.id,
      productId: image.productId,
      url: image.url,
      publicId: image.publicId,
      createdAt: image.createdAt.toISOString(),
      updatedAt: image.updatedAt.toISOString(),
    }));
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

    this.logger.info(`Product found: ${JSON.stringify(product.id)}`);
    return product;
  }

  // Helper to handle image upload and save URL to database
  private async uploadAndSaveImages(
    productId: number,
    files: Express.Multer.File[],
  ): Promise<ImageResponse[]> {
    this.logger.info(
      `IMAGE SERVICE | UPLOAD AND SAVE IMAGES : Uploading ${files.length} files for productId: ${productId}`,
    );
    try {
      // Pastikan upload berhasil
      const uploadResults = await this.fileUploadService.uploadImages(files);

      // Debug uploadResults untuk memastikan ada hasil yang benar
      uploadResults.forEach((result) => {
        this.logger.info(
          `IMAGE SERVICE | UPLOAD AND SAVE IMAGES : Upload results: ${JSON.stringify(result)}`,
        );
      });

      const imagePromises = uploadResults.map(async (result) => {
        if (result instanceof Error) {
          throw new Error(result.message);
        }

        // Pastikan result memiliki secure_url
        if (!result.secure_url) {
          throw new Error('URL for uploaded image is undefined');
        }

        const image = await this.prismaService.image.create({
          data: {
            productId,
            url: result.secure_url,
            publicId: result.public_id,
          },
        });

        return image;
      });

      const images = await Promise.all(imagePromises);
      return this.toImageResponse(images);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Upload image
  async uploadImage(image: Express.Multer.File): Promise<string> {
    if (!image) {
      throw new BadRequestException('No image provided for upload');
    }

    try {
      const uploadResult = await this.fileUploadService.uploadImage(image);
      if (!uploadResult?.secure_url) {
        throw new InternalServerErrorException(
          'Failed to upload image to Cloudinary',
        );
      }

      this.logger.warn(
        `IMAGE SERVICE | UPLOAD IMAGE : Uploaded result: ${JSON.stringify(uploadResult)}`,
      );
      return uploadResult.secure_url;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Upload multiple images for a product
  async uploadImages(
    request: CreateImageRequest,
    images: Express.Multer.File[],
  ): Promise<ImageResponse[]> {
    this.logger.warn(
      `IMAGE SERVICE | UPLOAD IMAGES : product_id: ${JSON.stringify(request.productId)}, url: ${images.map((image) => image.originalname)}`,
    );

    console.log('Request Body:', request); // Log request untuk memeriksa data yang masuk
    console.log('Images:', images); // Log files yang di-upload
    try {
      const createRequest = await this.validationService.validate(
        ImageValidation.CREATE,
        request,
      );
      const product = await this.checkExistingProduct(createRequest.productId);

      // Upload and save images
      return await this.uploadAndSaveImages(product.id, images);
    } catch (error) {
      this.handleError(error);
    }
  }
  // Retrive all the images
  async list(
    productId: number,
    page = 1,
    size = 10,
  ): Promise<WebResponse<ImageResponse[]>> {
    this.logger.warn(
      `IMAGE SERVICE | LIST: product_id: ${JSON.stringify(productId)} retrieving product list`,
    );

    try {
      const product = await this.checkExistingProduct(productId);

      const skip = (page - 1) * size;
      const [images, total] = await Promise.all([
        this.prismaService.image.findMany({
          where: { productId: product.id },
          skip,
          take: size,
        }),
        this.prismaService.image.count({ where: { productId: product.id } }),
      ]);

      if (!images.length) throw new NotFoundException('Images not found');

      this.logger.info(
        `IMAGE SERVICE | FETCH SUCCESS: Retrieved ${images.length} images`,
      );

      return {
        data: this.toImageResponse(images),
        paging: {
          current_page: page,
          size,
          total_page: Math.ceil(total / size),
        },
      };
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
      return this.toImageResponse([image])[0];
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

      await this.prismaService.image.delete({
        where: { id: imageId },
      });

      await this.fileUploadService.deleteImage(image.publicId.toString());

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

      const images = await this.prismaService.image.findUnique({
        where: { id: updateRequest.id },
      });
      return this.toImageResponse([images])[0];
    } catch (error) {
      this.handleError(error);
    }
  }
}
