import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Contact, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import {
  ContactResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '../../model/contact.model';
import { Logger } from 'winston';
import { ContactValidation } from './contact.validation';
import { ZodError } from 'zod';

@Injectable()
export class ContactService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService,
  ) {}

  private toContactResponse(contact: Contact): ContactResponse {
    return {
      id: contact.id,
      userId: contact.userId,
      phone: contact.phone,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }

  private async checkExistingContact(
    id: number,
    userId: number,
  ): Promise<Contact> {
    const contact = await this.prismaService.contact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  private async checkPhoneExists(
    userId: number,
    phone: string,
    excludeId?: number,
  ): Promise<void> {
    const existingContact = await this.prismaService.contact.findFirst({
      where: {
        userId,
        phone,
        NOT: { id: excludeId },
      },
    });

    if (existingContact) {
      throw new BadRequestException('You have already added this phone number');
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
    request: CreateContactRequest,
  ): Promise<ContactResponse> {
    this.logger.info(
      `CONTACT SERVICE | CREATE: user { id: ${user.id}, email: ${user.email} } trying to create contact`,
    );

    try {
      const createRequest = await this.validationService.validate(
        ContactValidation.CREATE,
        request,
      );

      await this.checkPhoneExists(user.id, createRequest.phone);

      const contact = await this.prismaService.contact.create({
        data: {
          userId: user.id,
          phone: createRequest.phone,
        },
      });

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(user: User, id: number): Promise<ContactResponse> {
    this.logger.info(
      `CONTACT SERVICE | GET: ${user.email} trying to retrieve contactId: ${id}`,
    );

    try {
      const contact = await this.checkExistingContact(id, user.id);

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    user: User,
    request: UpdateContactRequest,
  ): Promise<ContactResponse> {
    this.logger.info(
      `CONTACT SERVICE | UPDATE: ${user.email} trying to update contact`,
    );

    try {
      const updateRequest = await this.validationService.validate(
        ContactValidation.UPDATE,
        request,
      );

      let contact = await this.checkExistingContact(updateRequest.id, user.id);

      await this.checkPhoneExists(
        contact.userId,
        updateRequest.phone,
        contact.id,
      );

      contact = await this.prismaService.contact.update({
        where: { id: contact.id },
        data: updateRequest,
      });

      return this.toContactResponse(contact);
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(
    user: User,
    id: number,
  ): Promise<{ message: string; success: boolean }> {
    this.logger.info(
      `CONTACT SERVICE | DELETE: ${user.email} trying to delete contactId: ${id}`,
    );

    try {
      const contact = await this.checkExistingContact(id, user.id);

      await this.prismaService.contact.delete({
        where: { id: contact.id },
      });

      return { message: 'Contact successfully deleted', success: true };
    } catch (error) {
      this.handleError(error);
    }
  }
}
