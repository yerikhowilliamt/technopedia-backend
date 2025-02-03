import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { Logger } from 'winston';
import { Category, Store, User } from '@prisma/client';
import {
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../model/category.model';
import { ZodError } from 'zod';
import { CategoryValidation } from './category.validation';
import WebResponse from '../../model/web.model';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) {}

  private toCategoryResponse(category: Category): CategoryResponse {
    return {
      id: category.id,
      storeId: category.storeId,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private async checkExistingStore(params: {
    userId: number;
    storeId: number;
  }): Promise<Store> {
    this.logger.warn(
      `Checking store existence with params: ${JSON.stringify(params)}`,
    );

    const store = await this.prismaService.store.findUnique({
      where: { userId: params.userId, id: params.storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  private async checkExistingCategory(params: {
    id: number;
    storeId: number;
  }): Promise<Category> {
    this.logger.warn(
      `Checking category existence with params: ${JSON.stringify(params)}`,
    );

    if (!params.id) {
      throw new BadRequestException('Category ID is required.');
    }

    const category = await this.prismaService.category.findUnique({
      where: { id: params.id },
    });

    if (!category || category.storeId !== params.storeId) {
      throw new NotFoundException(
        'Category not found or does not belong to the store.',
      );
    }

    return category;
  }

  private handleError(error: Error): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(error.message);
    } else if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    } else {
      this.logger.error(`Internal Server Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  async create(
    user: User,
    request: CreateCategoryRequest,
  ): Promise<CategoryResponse> {
    this.logger.warn(
      `CATEGORY SERVICE | CREATE: { user_id: ${user.id}, category_name: ${request.name} }`,
    );

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId: request.storeId,
      });

      const createRequest: CreateCategoryRequest =
        await this.validationService.validate(
          CategoryValidation.CREATE,
          request,
        );

      const category = await this.prismaService.category.create({
        data: {
          name: createRequest.name,
          storeId: store.id,
        },
      });

      return this.toCategoryResponse(category);
    } catch (error) {
      this.handleError(error);
    }
  }

  async list(
    user: User,
    storeId: number,
    page: number = 1,
    size: number = 10,
  ): Promise<WebResponse<CategoryResponse[]>> {
    this.logger.warn(
      `CATEGORY SERVICE | LIST: ${user.email} trying to retrive list of category }`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const skip = (page - 1) * size;

      const [categories, total] = await Promise.all([
        this.prismaService.category.findMany({
          where: { storeId: store.id },
          skip: skip,
          take: size,
        }),
        await this.prismaService.category.count({
          where: { storeId: store.id },
        })
      ]);

      if (categories.length === 0 ) {
        throw new NotFoundException('Categories not found')
      }

      const totalPage = Math.ceil(total / size);

      return {
        data: categories.map(this.toCategoryResponse),
        paging: {
          current_page: page,
          size: size,
          total_page: totalPage,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(
    user: User,
    storeId: number,
    id: number,
  ): Promise<CategoryResponse> {
    this.logger.warn(
      `CATEGORY SERVICE | GET: ${user.email} trying to retrieve category_id: ${id} }`,
    );
    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const category = await this.checkExistingCategory({
        id,
        storeId: store.id,
      });

      return this.toCategoryResponse(category);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateCategoryRequest,
  ): Promise<CategoryResponse> {
    this.logger.warn(
      `CATEGORY SERVICE | UPDATE: ${user.email} trying to update category with id: ${JSON.stringify(request.id)}`,
    );

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId: request.storeId,
      });

      const updateRequest: UpdateCategoryRequest =
        await this.validationService.validate(
          CategoryValidation.UPDATE,
          request,
        );

      let category = await this.checkExistingCategory({
        id: updateRequest.id,
        storeId: store.id,
      });

      category = await this.prismaService.category.update({
        where: { id: category.id },
        data: {
          name: updateRequest.name,
        },
      });

      return this.toCategoryResponse(category);
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(
    user: User,
    storeId: number,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.logger.info(
      `CATEGORY SERVICE | DELETE: ${user.email} with store_id: ${JSON.stringify(storeId)} trying to delete category_id: ${id}`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const category = await this.checkExistingCategory({
        id,
        storeId: store.id,
      });

      await this.prismaService.category.delete({
        where: { id: category.id },
      });

      return { message: 'Category successfully deleted', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
}
