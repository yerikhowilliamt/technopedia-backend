import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Address, Contact, User } from '@prisma/client';
import { PrismaService } from '../src/common/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TestService {
  private readonly testUsername = process.env.TEST_USERNAME;
  private readonly testEmail = process.env.TEST_EMAIL;
  private readonly testPassword = process.env.TEST_PASSWORD;
  private readonly contactPhone = process.env.TEST_CONTACT_PHONE;

  private readonly addressStreet = process.env.TEST_ADDRESS_STREET;
  private readonly addressCity = process.env.TEST_ADDRESS_CITY;
  private readonly addressProvince = process.env.TEST_ADDRESS_PROVINCE;
  private readonly addressCountry = process.env.TEST_ADDRESS_COUNTRY;
  private readonly addressPostalCode = process.env.TEST_ADDRESS_POSTAL_CODE;

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  private generateAccessToken(userId: number, email: string): string {
    return this.jwtService.sign({ id: userId, email }, { expiresIn: '2h' });
  }

  async deleteAll() {
    try {
      const user = await this.getUser();
      if (user) {
        await Promise.all([
          this.prismaService.address.deleteMany({ where: { userId: user.id } }),
          this.prismaService.contact.deleteMany({ where: { userId: user.id } }),
          this.prismaService.user.deleteMany({ where: { email: user.email } }),
        ]);
      }
    } catch (error) {
      console.error('Error deleting all user data:', error);
      throw new Error('Failed to delete all user data');
    }
  }

  async deleteUser(email = this.testEmail) {
    try {
      await this.prismaService.user.deleteMany({ where: { email } });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user with email: ${email}`);
    }
  }

  async deleteContact() {
    try {
      const user = await this.getUser();
      if (user) {
        await this.prismaService.contact.deleteMany({ where: { userId: user.id } });
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw new Error('Failed to delete contact');
    }
  }

  async deleteAddress() {
    try {
      const user = await this.getUser();
      if (user) {
        await this.prismaService.address.deleteMany({ where: { userId: user.id } });
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      throw new Error('Failed to delete address');
    }
  }

  async createUser() {
    try {
      const hashedPassword = await bcrypt.hash(this.testPassword, 10);
      const user = await this.prismaService.user.create({
        data: {
          name: this.testUsername,
          email: this.testEmail,
          password: hashedPassword,
        },
      });
      const accessToken = this.generateAccessToken(user.id, this.testEmail);

      await this.prismaService.user.update({
        where: { email: this.testEmail },
        data: { accessToken },
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async createContact() {
    try {
      const user = await this.getUser();
      if (user) {
        await this.prismaService.contact.create({
          data: {
            userId: user.id,
            phone: this.contactPhone,
          },
        });
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      throw new Error('Failed to create contact');
    }
  }

  async createAddress() {
    try {
      const user = await this.getUser();
      if (user) {
        await this.prismaService.address.create({
          data: {
            userId: user.id,
            street: this.addressStreet,
            city: this.addressCity,
            province: this.addressProvince,
            country: this.addressCountry,
            postalCode: this.addressPostalCode,
          },
        });
      }
    } catch (error) {
      console.error('Error creating address:', error);
      throw new Error('Failed to create address');
    }
  }

  async getUser(email = this.testEmail): Promise<User | null> {
    try {
      return await this.prismaService.user.findUnique({
        where: { email },
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getContact(): Promise<Contact | null> {
    try {
      const user = await this.getUser();
      if (user) {
        return await this.prismaService.contact.findFirst({
          where: { userId: user.id },
        });
      }
      return null;
    } catch (error) {
      console.error('Error fetching contact:', error);
      throw new Error('Failed to fetch contact');
    }
  }

  async getAddress(): Promise<Address | null> {
    try {
      const user = await this.getUser();
      if (user) {
        return await this.prismaService.address.findFirst({
          where: { userId: user.id },
        });
      }
      return null;
    } catch (error) {
      console.error('Error fetching address:', error);
      throw new Error('Failed to fetch address');
    }
  }
}
