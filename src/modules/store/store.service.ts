import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { CreateStoreRequest, StoreResponse } from '../../model/store.model';
import { Logger } from 'winston';
import { StoreValidation } from './store.validation';

@Injectable()
export class StoreService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) { }
  
  async create(request: CreateStoreRequest): Promise<StoreResponse> {
    try {
      this.logger.info(`STORE SERVICE | CREATE : name: ${ request.name }`);

      const createRequest: CreateStoreRequest = await this.validationService.validate(StoreValidation.CREATE, request);

      return
    } catch (error) {
      throw error
    }
  }
}
