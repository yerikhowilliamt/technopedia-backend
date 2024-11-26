import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Contact, User } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../common/prisma.service';
import { ValidationService } from '../../common/validation.service';
import { ContactResponse, CreateContactRequest, UpdateContactRequest } from '../../model/contact.model';
import { Logger } from 'winston';
import { ContactValidation } from './contact.validation';
import { ZodError } from 'zod';

@Injectable()
export class ContactService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private validationService: ValidationService
  ) { }
  
  private toContactResponse(contact: Contact): ContactResponse {
    return {
      id: contact.id,
      userId: contact.userId,
      phone: contact.phone,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString()
    };
  }

  private async checkExistingContact(userId: number): Promise<Contact> {
    try {
      const contactExists = await this.prismaService.contact.findFirst({
        where: {
          userId,
        }
      });
  
      if (contactExists) {
        throw new BadRequestException('This contact is already exists')
      }
  
      return contactExists;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }

      throw new InternalServerErrorException(error)
    }
  }

  async create(user: User, request: CreateContactRequest): Promise<ContactResponse> {
    try {
      this.logger.info(`CONTACT SERVICE | CREATE : user: { email: ${ user.email }, id: ${user.id} } trying creat contact`)
    
    const createRequest: CreateContactRequest = await this.validationService.validate(ContactValidation.CREATE, request);

    await this.checkExistingContact(user.id)

    const contact = await this.prismaService.contact.create({
      data: {
        userId: user.id,
        phone: createRequest.phone
      }
    })

    return this.toContactResponse(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(error)
    }
  }

  async get(user: User, id: number): Promise<ContactResponse> {
    try {
      this.logger.info(`CONTACT SERVICE | GET : user: ${ user.email } id: ${id}`)
      
      const contact = await this.prismaService.contact.findUnique({
        where: {
          userId: user.id,
          id
        }
      })

      if (!contact) {
        throw new NotFoundException('Contact not found')
      }

      return this.toContactResponse(contact)

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }

      throw new InternalServerErrorException(error)
    }
  }

  async update(user: User, request: UpdateContactRequest): Promise<ContactResponse> {
    try {
      this.logger.info(`CONTACT SERVICE | UPDATE : ${ user.email } trying update their contact: ${ request }`)
      
      const updateRequest: UpdateContactRequest = await this.validationService.validate(ContactValidation.UPDATE, request);

      const contact = await this.prismaService.contact.update({
        where: {
          userId: user.id,
          id: request.id
        },
        data: updateRequest
      });

      return this.toContactResponse(contact)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.message)
      }

      throw new InternalServerErrorException(error)
    }
  }

  async delete(user: User, contactId: number): Promise<{ message: string; success: boolean }> {
    try {
      this.logger.info(`CONTACT SERVICE | DELETE : ${ user.email } trying to delete their contact`);

      await this.prismaService.contact.delete({
        where: {
          userId: user.id,
          id: contactId
        }
      })

      return {
        message: 'Deleting contact successful',
        success: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }
}
