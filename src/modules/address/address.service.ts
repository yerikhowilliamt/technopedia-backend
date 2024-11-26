import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Address, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { AddressResponse, CreateAddressRequest } from '../../model/address.model';
import { Logger } from 'winston';
import { AddressValidation } from './address.validation';
import { ZodError } from 'zod';
import WebResponse from '../../model/web.model';

@Injectable()
export class AddressService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService
  ) { }

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
      updatedAt: address.updatedAt.toISOString()
    }
  }

  private async primaryAddress(userId: number): Promise<void> {
    try {
      await this.prismaService.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  private async checkExistingAddress(
    userId: number,
    street: string,
    city: string,
    province: string,
    country: string,
    postalCode: string
  ): Promise<Address> {
    try {
      const addressExists = await this.prismaService.address.findFirst({
        where: {
          userId,
          street,
          city,
          province,
          country,
          postalCode
        }
      })

      if (addressExists) {
        throw new BadRequestException('This Address is already exists')
      }

      return addressExists
    } catch (error) {
      this.logger.error(`Error during address check: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error
      }

      this.logger.error(`Error checking address: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error)
    }
  }

  async create(user: User, request: CreateAddressRequest): Promise<AddressResponse> {
    try {
      this.logger.info(`ADDRESS SERVICE | CREATE : user: { email: ${ user.email }, id: ${ user.id } } trying creat address`);

      const createRequest: CreateAddressRequest = await this.validationService.validate(AddressValidation.CREATE, request);

      await this.checkExistingAddress(
        user.id,
        createRequest.street,
        createRequest.city,
        createRequest.province,
        createRequest.country,
        createRequest.postalCode,
      );

      if (createRequest.isPrimary) {
        await this.primaryAddress(user.id);
      }

      const address = await this.prismaService.address.create({
        data: {
          userId: user.id,
          street: createRequest.street,
          city: createRequest.city,
          province: createRequest.province,
          country: createRequest.country,
          postalCode: createRequest.postalCode,
          isPrimary: createRequest.isPrimary
        }
      });

      return this.toAddressResponse(address)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof BadRequestException) {
        throw error
      }

      this.logger.error(`Internal Server Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error)
    }
  }

  async list(user: User, limit: number = 5, page: number = 1): Promise<WebResponse<AddressResponse[]>> {
    try {
      const skip = (page - 1) * limit;

      const [addresses, total] = await Promise.all([
        this.prismaService.address.findMany({
          where: {
            userId: user.id
          },
          skip,
          take: limit
        }),
      
        this.prismaService.address.count({
          where: {
            userId: user.id
          }
        })
      ]) 

      const totalPages = Math.ceil(total / limit);

      return {
        data: addresses.map((address) => this.toAddressResponse(address)),
        paging: {
          size: limit,
          current_page: page,
          total_page: totalPages
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }

      throw new InternalServerErrorException(error)
    }
  }
}
