import { Module } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [StoreModule],
  providers: [BannerService],
  controllers: [BannerController],
})
export class BannerModule {}
