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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BannerService } from './banner.service';
import WebResponse, { Paging } from '../../model/web.model';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import {
  BannerResponse,
  CreateBannerRequest,
  UpdateBannerRequest,
} from '../../model/banner.model';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/common/auth/auth.decorator';
import { User } from '@prisma/client';
import { StoreValidationService } from '../store/store-validation.service';

@Controller('stores/:storeId/banners')
export class BannerController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private bannerService: BannerService,
    private storeValidationService: StoreValidationService,
  ) {}

  private toBannerResponse<T>(
    data: T,
    statusCode: number,
    paging?: Paging,
  ): WebResponse<T> {
    return {
      data,
      statusCode,
      timestamp: new Date().toISOString(), // Menggunakan format ISO yang lebih standar
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

    this.logger.error('Unhandled error occurred', { error: error.message, stack: error.stack });
    throw error;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: CreateBannerRequest,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<WebResponse<BannerResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      action: 'CREATE',
      timestamp: new Date().toISOString(),
    };

    try {
      // Validate Store ID
      await this.storeValidationService.validateStore(storeId);

      request.storeId = storeId;
      if (!request.storeId) {
        this.logger.warn('Missing Store ID in request body', logData);
        throw new BadRequestException('Store ID are required.');
      }

      this.logger.info('Creating banner', logData);

      const result = await this.bannerService.create(user, request, file);

      this.logger.info('Banner created successfully', {
        ...logData,
        bannerId: result.id,
      });

      return this.toBannerResponse(result, 201);
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
  ): Promise<WebResponse<BannerResponse[]>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      action: 'LIST',
      timestamp: new Date().toISOString(),
    };

    try {
      // Validate Store ID
      await this.storeValidationService.validateStoreForUser(user.id, storeId);

      this.logger.info('Listing banners', logData);

      const result = await this.bannerService.list(user, storeId, page, limit);

      this.logger.info('Banners retrieved successfully', {
        ...logData,
        totalItems: result.paging?.size,
      });

      return this.toBannerResponse(result.data, 200, result.paging);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':bannerId')
  @UseGuards(JwtAuthGuard)
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('bannerId', ParseIntPipe) bannerId: number,
  ): Promise<WebResponse<BannerResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      bannerId: bannerId,
      action: 'GET',
      timestamp: new Date().toISOString(),
    };

    try {
      // Validate Store ID
      await this.storeValidationService.validateStoreForUser(user.id, storeId);

      this.logger.info('Fetching banner details', logData);

      const result = await this.bannerService.get(user, storeId, bannerId);

      this.logger.info('Banner details retrieved', logData);

      return this.toBannerResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':bannerId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('bannerId', ParseIntPipe) bannerId: number,
    @Body() request: UpdateBannerRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<WebResponse<BannerResponse>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      bannerId: bannerId,
      action: 'UPDATE',
      timestamp: new Date().toISOString(),
    };

    try {
      // Validate Store ID
      await this.storeValidationService.validateStoreForUser(user.id, storeId);

      request.id = bannerId;
      request.storeId = storeId;

      if (!request.id || !request.storeId) {
        this.logger.warn('Missing Banner ID or Store ID in request body', logData);
        throw new BadRequestException('Banner ID and Store ID are required.');
      }

      this.logger.info('Updating banner', logData);

      const result = await this.bannerService.update(user, request, file);

      this.logger.info('Banner updated successfully', {
        ...logData,
        updatedBannerId: result.id,
      });

      return this.toBannerResponse(result, 200);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':bannerId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('bannerId', ParseIntPipe) bannerId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    const logData = {
      userId: user.id,
      storeId: storeId,
      bannerId: bannerId,
      action: 'DELETE',
      timestamp: new Date().toISOString(),
    };

    try {
      // Validate Store ID
      await this.storeValidationService.validateStoreForUser(user.id, storeId);

      this.logger.info('Deleting banner', logData);

      const result = await this.bannerService.delete(user, storeId, bannerId);

      this.logger.info('Banner deleted successfully', {
        ...logData,
        success: result.success,
      });

      return this.toBannerResponse(
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
