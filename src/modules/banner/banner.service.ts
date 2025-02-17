import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Banner, Store, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import {
  BannerResponse,
  CreateBannerRequest,
  UpdateBannerRequest,
} from '../../model/banner.model';
import { Logger } from 'winston';
import { ZodError } from 'zod';
import { BannerValidation } from './banner.validation';
import WebResponse from '../../model/web.model';
import { ImageService } from '../image/image.service';

@Injectable()
export class BannerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
    private imageService: ImageService,
  ) {}

  private toBannerResponse(banner: Banner): BannerResponse {
    return {
      id: banner.id,
      storeId: banner.storeId,
      name: banner.name,
      imageUrl: banner.imageUrl,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
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

  private async checkExistingBanner(params: {
    id: number;
    storeId: number;
  }): Promise<Banner> {
    this.logger.warn(
      `Checking banner existence with params: ${JSON.stringify(params)}`,
    );

    if (!params.id) {
      throw new BadRequestException('Banner ID is required.');
    }

    const banner = await this.prismaService.banner.findUnique({
      where: { id: params.id },
    });

    if (!banner || banner.storeId !== params.storeId) {
      throw new NotFoundException(
        'Banner not found or does not belong to the store.',
      );
    }

    return banner;
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
    request: CreateBannerRequest,
    image: Express.Multer.File,
  ): Promise<BannerResponse> {
    this.logger.warn(
      `BANNER SERVICE | CREATE: { user_id: ${user.id}, banner_name: ${request.name} }`,
    );

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId: request.storeId,
      });

      const createRequest: CreateBannerRequest =
        await this.validationService.validate(BannerValidation.CREATE, request);

      if (image) {
        createRequest.imageUrl = await this.imageService.uploadImage(image);
      }

      const banner = await this.prismaService.banner.create({
        data: {
          storeId: store.id,
          name: createRequest.name,
          imageUrl: createRequest.imageUrl,
        },
      });

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleError(error);
    }
  }

  async list(
    user: User,
    storeId: number,
    page: number = 1,
    size: number = 10,
  ): Promise<WebResponse<BannerResponse[]>> {
    this.logger.warn(
      `BANNER SERVICE | LIST: ${user.email} trying to retrive list of banners }`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const skip = (page - 1) * size;

      const [banners, total] = await Promise.all([
        this.prismaService.banner.findMany({
          where: { storeId: store.id },
          skip: skip,
          take: size
        }),
        await this.prismaService.banner.count({
          where: { storeId: store.id },
        })
      ])

      if (banners.length === 0) {
        throw new NotFoundException('Banners not found')
      }

      const totalPage = Math.ceil(total / size);

      return {
        data: banners.map(this.toBannerResponse),
        paging: {
          current_page: page,
          size: size,
          total_page: totalPage
        }
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  async get(user: User, storeId: number, id: number): Promise<BannerResponse> {
    this.logger.warn(
      `BANNER SERVICE | GET: ${user.email} trying to retrieve banner_id: ${id} }`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const banner = await this.checkExistingBanner({ id, storeId: store.id });

      return this.toBannerResponse(banner);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateBannerRequest,
    image?: Express.Multer.File,
  ): Promise<BannerResponse> {
    this.logger.warn(
      `BANNER SERVICE | UPDATE: ${user.email} trying to update banner with id: ${JSON.stringify(request.id)}`,
    );

    try {
      const store = await this.checkExistingStore({
        userId: user.id,
        storeId: request.storeId,
      });

      const updateRequest: UpdateBannerRequest =
        await this.validationService.validate(BannerValidation.UPDATE, request);

      if (image) {
        updateRequest.imageUrl = await this.imageService.uploadImage(image);
      }

      let banner = await this.checkExistingBanner({
        id: updateRequest.id,
        storeId: store.id,
      });

      banner = await this.prismaService.banner.update({
        where: { id: banner.id },
        data: {
          name: updateRequest.name,
          imageUrl: updateRequest.imageUrl,
        },
      });

      return this.toBannerResponse(banner);
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
      `BANNER SERVICE | DELETE: ${user.email} with store_id: ${JSON.stringify(storeId)} trying to delete banner_id: ${id}`,
    );

    try {
      const store = await this.checkExistingStore({ userId: user.id, storeId });

      const banner = await this.checkExistingBanner({ id, storeId: store.id });

      await this.prismaService.banner.delete({
        where: { id: banner.id },
      });

      return { message: 'Banner successfully deleted', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
}
