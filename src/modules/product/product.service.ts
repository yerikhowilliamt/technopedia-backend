import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Category, Product, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import {
  CreateProductRequest,
  ProductResponse,
  UpdateProductRequest,
} from '../../model/product.model';
import { Logger } from 'winston';
import { ZodError } from 'zod';
import { ProductValidation } from './product.validation';
import WebResponse from '../../model/web.model';

@Injectable()
export class ProductService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) {}

  private toProductResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      storeId: product.storeId,
      categoryId: product.categoryId,
      colorId: product.colorId,
      name: product.name,
      price: product.price.toString(),
      isFeatured: product.isFeatured,
      isArchived: product.isArchived,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private async validateStoreCategoryColor(params: {
    userId: number;
    storeId: number;
    categoryId?: number;
    colorId?: number;
  }) {
    const store = await this.prismaService.store.findUnique({
      where: { userId: params.userId, id: params.storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    let category: Category | null = null;
    let color: Category | null = null;

    if (params.categoryId) {
      category = await this.prismaService.category.findUnique({
        where: { storeId: params.storeId, id: params.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    if (params.colorId) {
      color = await this.prismaService.color.findUnique({
        where: { storeId: params.storeId, id: params.colorId },
      });
      if (!color) throw new NotFoundException('Color not found');
    }

    return { store, category, color };
  }

  private async checkExistingProduct(
    id: number,
    storeId: number,
    categoryId: number,
    colorId: number,
  ): Promise<Product> {
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    if (!product || product.storeId !== storeId || product.categoryId !== categoryId || product.colorId !== colorId) {
      throw new NotFoundException('Product not found or does not belong to the store.');
    }

    return product;
  }

  private handleError(error: Error): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error(`Internal Server Error: ${error.message}`, error.stack);
    throw new InternalServerErrorException('An unexpected error occurred');
  }

  async create(user: User, request: CreateProductRequest): Promise<ProductResponse> {
    this.logger.warn(`PRODUCT SERVICE | CREATE: { user_id: ${user.id}, product_name: ${request.name} }`);
    try {
      const { store, category, color } = await this.validateStoreCategoryColor({
        userId: user.id,
        storeId: request.storeId,
        categoryId: request.categoryId,
        colorId: request.colorId,
      });

      const validatedRequest = await this.validationService.validate(ProductValidation.CREATE, request);

      const product = await this.prismaService.product.create({
        data: {
          storeId: store.id,
          categoryId: category.id,
          colorId: color.id,
          name: validatedRequest.name,
          price: validatedRequest.price,
          isFeatured: validatedRequest.isFeatured,
          isArchived: validatedRequest.isArchived,
        },
      });

      this.logger.info(`PRODUCT SERVICE | CREATE SUCCESS: Product ${product.id} created by user ${user.id}`);

      return this.toProductResponse(product);
    } catch (error) {
      this.handleError(error);
    }
  }

  async list(user: User, storeId: number, page = 1, size = 10): Promise<WebResponse<ProductResponse[]>> {
    this.logger.warn(`PRODUCT SERVICE | LIST: ${user.email} retrieving product list`);
    try {
      await this.validateStoreCategoryColor({ userId: user.id, storeId });

      const skip = (page - 1) * size;
      const [products, total] = await Promise.all([
        this.prismaService.product.findMany({ where: { storeId }, skip, take: size }),
        this.prismaService.product.count({ where: { storeId } }),
      ]);

      if (!products.length) throw new NotFoundException('Products not found');

      this.logger.info(`PRODUCT SERVICE | FETCH SUCCESS: Retrieved ${products.length} products`);

      return {
        data: products.map(this.toProductResponse),
        paging: { current_page: page, size, total_page: Math.ceil(total / size) },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(user: User, storeId: number, categoryId: number, colorId: number, id: number): Promise<ProductResponse> {
    try {
      await this.validateStoreCategoryColor({ userId: user.id, storeId, categoryId, colorId });
      const product = await this.checkExistingProduct(id, storeId, categoryId, colorId);

      this.logger.info(`PRODUCT SERVICE | FETCH SUCCESS: Retrieved product ${product.id}`);
      return this.toProductResponse(product);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(user: User, request: UpdateProductRequest): Promise<ProductResponse> {
    try {
      const { store, category, color } = await this.validateStoreCategoryColor({
        userId: user.id,
        storeId: request.storeId,
        categoryId: request.categoryId,
        colorId: request.colorId,
      });

      await this.checkExistingProduct(request.id, store.id, category.id, color.id);
      const validatedRequest = await this.validationService.validate(ProductValidation.UPDATE, request);

      const updatedProduct = await this.prismaService.product.update({
        where: { id: request.id },
        data: { name: validatedRequest.name, price: validatedRequest.price, isFeatured: validatedRequest.isFeatured },
      });

      this.logger.info(`PRODUCT SERVICE | UPDATE SUCCESS: Product ${updatedProduct.id} updated by user ${user.id}`);

      return this.toProductResponse(updatedProduct);
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(user: User, storeId: number, categoryId: number, colorId: number, id: number): Promise<{ message: string; success: boolean }> {
    this.logger.warn(`PRODUCT SERVICE | DELETE: { user_id: ${user.id}, product_id: ${id} }`);
    try {
      await this.validateStoreCategoryColor({ userId: user.id, storeId, categoryId, colorId });
      await this.checkExistingProduct(id, storeId, categoryId, colorId);
  
      await this.prismaService.product.delete({ where: { id } });
  
      this.logger.info(`PRODUCT SERVICE | DELETE SUCCESS: Product with id ${ id } deleted`);
      
      return { message: 'Product successfully deleted', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
  
}
