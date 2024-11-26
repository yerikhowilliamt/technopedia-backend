import { Body, Controller, ForbiddenException, Get, InternalServerErrorException, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AddressResponse, CreateAddressRequest } from '../../model/address.model';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import WebResponse from '../../model/web.model';

@Controller('users/:userId/addresses')
export class AddressController {
  constructor(private adressService: AddressService) { }
  
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateAddressRequest
  ): Promise<WebResponse<AddressResponse>> {
    try {
      request.userId = userId

      if (request.userId !== userId) {
        throw new ForbiddenException(`You are not authorized to view this user's addresses`);
      }
      
      const result = await this.adressService.create(user, request);

      return {
        data: result,
        statusCode: 201,
        timestamp: new Date().toString(),
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error
      }

      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page',  new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit',  new ParseIntPipe({ optional: true })) limit: number = 5,
  ): Promise<WebResponse<AddressResponse[]>> {
    try {
      if (user.id !== userId) {
        throw new ForbiddenException(`You are not authorized to view this user's addresses`);
      }

      const result = await this.adressService.list(user, limit, page);

      return {
        data: result.data,
        paging: result.paging,
        statusCode: 200,
        timestamp: new Date().toString(),
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error
      }

      throw new InternalServerErrorException(error);
    }
  }
}
