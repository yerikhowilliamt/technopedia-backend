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
import {
  CreateStoreRequest,
  StoreResponse,
  UpdateStoreRequest,
} from '../../model/store.model';
import { Logger } from 'winston';
import { StoreValidation } from './store.validation';
import { Store, User } from '@prisma/client';
import { ZodError } from 'zod';

@Injectable()
export class StoreService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) {}

  private toStoreResponse(store: Store): StoreResponse {
    return {
      id: store.id,
      userId: store.userId,
      name: store.name,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
  }

  private async checkExistingStore(id: number, userId: number): Promise<Store> {
    const store = await this.prismaService.store.findFirst({
      where: { id, userId },
    });

    if (!store) {
      throw new NotFoundException(`Store not found`);
    }

    return store;
  }

  private async checkStoreNameExists(
    userId: number,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const storeNameExists = await this.prismaService.store.findFirst({
      where: {
        userId,
        name,
        NOT: { id: excludeId },
      },
    });

    if (storeNameExists) {
      throw new BadRequestException('You have already added this store');
    }
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
    request: CreateStoreRequest,
  ): Promise<StoreResponse> {
    this.logger.info(
      `STORE SERVICE | CREATE: { user_email: ${user.email}, store_name: ${request.name} }`,
    );
    try {
      const createRequest: CreateStoreRequest =
        await this.validationService.validate(StoreValidation.CREATE, request);

      await this.checkStoreNameExists(user.id, createRequest.name);

      const store = await this.prismaService.store.create({
        data: {
          userId: user.id,
          name: createRequest.name,
        },
      });

      this.logger.info(
        `STORE SERVICE | CREATE: { user_email: ${user.email}, store_name: ${store.name} }`,
      );

      return this.toStoreResponse(store);
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(user: User, id: number): Promise<StoreResponse> {
    try {
      this.logger.info(
        `STORE SERVICE | GET: ${user.email} trying to retrieve storeId: ${id} }`,
      );

      const store = await this.checkExistingStore(id, user.id);

      return this.toStoreResponse(store);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateStoreRequest,
  ): Promise<StoreResponse> {
    this.logger.info(
      `STORE SERVICE | UPDATE: ${user.email} trying to update store`,
    );

    try {
      const updateRequest: UpdateStoreRequest =
        await this.validationService.validate(StoreValidation.UPDATE, request);

      let store = await this.checkExistingStore(updateRequest.id, user.id);

      await this.checkStoreNameExists(store.id, updateRequest.name, user.id);

      store = await this.prismaService.store.update({
        where: { id: store.id, userId: user.id },
        data: { name: updateRequest.name },
      });

      return this.toStoreResponse(store);
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.logger.info(
      `STORE SERVICE | DELETE: ${user.email} trying to delete storeId: ${id}`,
    );
    
    try {
      const store = await this.checkExistingStore(user.id, id);

      await this.prismaService.store.delete({
        where: { id: store.id },
      });

      return { message: 'Store successfully deleted', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
}
