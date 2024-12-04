import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Address, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import {
  AddressResponse,
  CreateAddressRequest,
  UpdateAddressRequest,
} from '../../model/address.model';
import { Logger } from 'winston';
import { AddressValidation } from './address.validation';
import { ZodError } from 'zod';
import WebResponse from '../../model/web.model';

@Injectable()
export class AddressService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) {}

  private toAddressResponse(address: Address): AddressResponse {
    return {
      id: address.id,
      userId: address.userId,
      street: address.street,
      city: address.city,
      province: address.province,
      country: address.country,
      postalCode: address.postalCode,
      isPrimary: address.isPrimary,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  private async checkExistingAddress(
    id: number,
    userId: number,
  ): Promise<Address> {
    const address = await this.prismaService.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  private async checkSameAddressExists(
    userId: number,
    params: Partial<Address>,
    excludeId?: number,
  ): Promise<void> {
    const existingAddress = await this.prismaService.address.findFirst({
      where: {
        ...params,
        userId,
        NOT: { id: excludeId },
      },
    });

    if (existingAddress) {
      throw new BadRequestException('This Address already exists');
    }
  }

  private async ensureSinglePrimaryAddress(
    userId: number,
    excludeId?: number,
  ): Promise<void> {
    const primaryAddresses = await this.prismaService.address.findMany({
      where: {
        userId,
        isPrimary: true,
        NOT: { id: excludeId },
      },
    });

    if (primaryAddresses.length > 0) {
      await this.prismaService.address.updateMany({
        where: {
          userId,
          isPrimary: true,
          id: { not: excludeId },
        },
        data: { isPrimary: false },
      });
    }
  }

  private async setPrimaryAddress(
    address: Address,
    userId: number,
  ): Promise<Address> {
    const currentPrimaryAddress = await this.prismaService.address.findFirst({
      where: { userId, isPrimary: true },
    });

    if (!currentPrimaryAddress && address.isPrimary) {
      return this.prismaService.address.update({
        where: { id: address.id },
        data: { isPrimary: true },
      });
    }

    if (address.isPrimary && currentPrimaryAddress?.id !== address.id) {
      await this.prismaService.address.update({
        where: { id: currentPrimaryAddress.id },
        data: { isPrimary: false },
      });

      return this.prismaService.address.update({
        where: { id: address.id },
        data: { isPrimary: true },
      });
    }

    return address;
  }

  private handleError(error: Error): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(error.message);
    } else if (error instanceof BadRequestException) {
      throw error;
    } else if (error instanceof NotFoundException) {
      throw error;
    } else {
      this.logger.error(`Internal Server Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async create(
    user: User,
    request: CreateAddressRequest,
  ): Promise<AddressResponse> {
    this.logger.info(
      `ADDRESS SERVICE | CREATE : ${user.email} trying to create address: {${JSON.stringify(request)}} }`,
    );

    try {
      const createRequest = await this.validationService.validate(
        AddressValidation.CREATE,
        request,
      );

      await this.checkSameAddressExists(user.id, createRequest);

      const currentPrimaryAddress = await this.prismaService.address.findFirst({
        where: { userId: user.id, isPrimary: true },
      });

      if (!currentPrimaryAddress && createRequest.isPrimary !== false) {
        createRequest.isPrimary = true;
      }

      const address = await this.prismaService.address.create({
        data: {
          userId: user.id,
          ...createRequest,
        },
      });

      return this.toAddressResponse(
        await this.setPrimaryAddress(address, user.id),
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async list(
    user: User,
    limit: number = 5,
    page: number = 1,
  ): Promise<WebResponse<AddressResponse[]>> {
    this.logger.info(
      `ADDRESS SERVICE | List addresses: user: { email: ${user.email}, id: ${user.id} }, limit: ${limit}, page: ${page}`,
    );

    try {
      const skip = (page - 1) * limit;
      const [addresses, total] = await Promise.all([
        this.prismaService.address.findMany({
          where: { userId: user.id },
          skip,
          take: limit,
        }),
        this.prismaService.address.count({
          where: { userId: user.id },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      return {
        data: addresses.map(this.toAddressResponse),
        paging: {
          size: limit,
          current_page: page,
          total_page: totalPages,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPrimary(user: User): Promise<AddressResponse> {
    this.logger.info(
      `ADDRESS SERVICE | Get primary address: ${user.email} trying to retrieve primary address`,
    );

    try {
      const address = await this.prismaService.address.findFirst({
        where: { userId: user.id, isPrimary: true },
      });

      if (!address) {
        throw new NotFoundException('Primary address not found');
      }

      return this.toAddressResponse(address);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateAddressRequest,
  ): Promise<AddressResponse> {
    this.logger.info(
      `ADDRESS SERVICE | UPDATE: ${user.email} trying to update address: {${JSON.stringify(request)}}`,
    );

    try {
      const updateRequest = await this.validationService.validate(
        AddressValidation.UPDATE,
        request,
      );

      let address = await this.checkExistingAddress(updateRequest.id, user.id);

      await this.checkSameAddressExists(
        user.id,
        { street: updateRequest.street },
        updateRequest.id,
      );

      if (updateRequest.isPrimary === true) {
        await this.ensureSinglePrimaryAddress(user.id, updateRequest.id);
      }

      address = await this.prismaService.address.update({
        where: { id: updateRequest.id, userId: user.id },
        data: updateRequest,
      });

      return this.toAddressResponse(
        await this.setPrimaryAddress(address, user.id),
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.logger.info(
      `ADDRESS SERVICE | DELETE: ${user.email} trying to delete addressId: ${id}`,
    );

    try {
      const address = await this.checkExistingAddress(user.id, id);

      await this.prismaService.address.delete({
        where: { id: address.id },
      });

      return { message: 'Address successfully deleted', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
}
