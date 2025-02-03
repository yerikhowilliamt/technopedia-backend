import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Color, Store, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import {
  ColorResponse,
  CreateColorRequest,
  UpdateColorRequest,
} from '../../model/color.model';
import { Logger } from 'winston';
import { ZodError } from 'zod';
import { ColorValidation } from './color.validation';
import WebResponse from '../../model/web.model';

@Injectable()
export class ColorService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) {}

  private toColorResponse(color: Color): ColorResponse {
    return {
      id: color.id,
      storeId: color.storeId,
      name: color.name,
      value: color.value,
      createdAt: color.createdAt.toISOString(),
      updatedAt: color.updatedAt.toISOString(),
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

  private async checkExistingColor(params: {
    id: number;
    storeId: number;
  }): Promise<Color> {
    this.logger.warn(
      `Checking color existence with params: ${JSON.stringify(params)}`,
    );

    if (!params.id) {
      throw new BadRequestException('Color ID is required.');
    }

    const color = await this.prismaService.color.findUnique({
      where: { id: params.id },
    });

    if (!color || color.storeId !== params.storeId) {
      throw new NotFoundException(
        'Color not found or does not belong to the store.',
      );
    }

    return color;
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
    request: CreateColorRequest,
  ): Promise<ColorResponse> {
    this.logger.warn(
      `COLOR SERVICE | CREATE: { user_id: ${user.id}, color_name: ${request.name}, color_value: ${request.value} }`,
    );

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId: request.storeId,
      });

      const createRequest: CreateColorRequest =
        await this.validationService.validate(ColorValidation.CREATE, request);

      const color = await this.prismaService.color.create({
        data: {
          storeId: store.id,
          name: createRequest.name,
          value: createRequest.value,
        },
      });

      return this.toColorResponse(color);
    } catch (error) {
      this.handleError(error);
    }
  }

  async list(
    user: User,
    storeId: number,
    page: number = 1,
    size: number = 10,
  ): Promise<WebResponse<ColorResponse[]>> {
    this.logger.warn(
      `COLOR SERVICE | LIST: ${user.email} trying to retrive list of colors }`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const skip = (page - 1) * size;

      const [colors, total] = await Promise.all([
        this.prismaService.color.findMany({
          where: { storeId: store.id },
          skip: skip,
          take: size,
        }),
        this.prismaService.color.count({
          where: { storeId: store.id },
        }),
      ]);

      if (colors.length === 0) {
        throw new NotFoundException('Colors not found');
      }

      const totalPage = Math.ceil(total / size);

      return {
        data: colors.map(this.toColorResponse),
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
    id: number): Promise<ColorResponse> {
    this.logger.warn(
      `COLOR SERVICE | GET: ${user.email} trying to retrieve color_id: ${id} }`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const color = await this.checkExistingColor({
        id,
        storeId: store.id,
      });

      return this.toColorResponse(color);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateColorRequest,
  ): Promise<ColorResponse> {
    this.logger.warn(
      `COLOR SERVICE | UPDATE: ${user.email} trying to update color with id: ${JSON.stringify(request.id)}`,
    );

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId: request.storeId,
      });

      const updateRequest: UpdateColorRequest =
        await this.validationService.validate(ColorValidation.UPDATE, request);

      let color = await this.checkExistingColor({
        id: updateRequest.id,
        storeId: store.id,
      });

      color = await this.prismaService.color.update({
        where: { id: color.id },
        data: {
          name: updateRequest.name,
          value: updateRequest.value,
        },
      });

      return this.toColorResponse(color);
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
      `COLOR SERVICE | DELETE: ${user.email} with store_id: ${JSON.stringify(storeId)} trying to delete color_id: ${id}`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const color = await this.checkExistingColor({
        id,
        storeId: store.id,
      });

      await this.prismaService.color.delete({
        where: { id: color.id },
      });

      return { message: 'Color successfully deleted', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
}
