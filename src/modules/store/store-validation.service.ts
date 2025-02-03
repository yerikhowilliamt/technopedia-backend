import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class StoreValidationService {
  constructor(private prismaService: PrismaService) {}

  // Validasi apakah store ada
  async validateStore(storeId: number) {
    const store = await this.prismaService.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found.`);
    }

    return store;
  }

  // Validasi apakah store yang diminta sesuai dengan milik pengguna
  async validateStoreForUser(userId: number, storeId: number) {
    const store = await this.prismaService.store.findFirst({
      where: {
        id: storeId,
        userId: userId, // validasi store ini milik user
      },
    });

    if (!store) {
      throw new ForbiddenException(`Store with ID ${storeId} is not owned by the user.`);
    }

    return store;
  }
}
