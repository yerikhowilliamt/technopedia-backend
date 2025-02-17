import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ImageModule } from '../image/image.module';

@Module({
  imports: [ImageModule],
  providers: [ProductService],
  controllers: [ProductController]
})
export class ProductModule {}
