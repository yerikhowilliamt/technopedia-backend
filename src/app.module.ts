import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { StoreModule } from './modules/store/store.module';
import { PassportModule } from '@nestjs/passport';
import { ContactModule } from './modules/contact/contact.module';
import { AddressModule } from './modules/address/address.module';
import { BannerModule } from './modules/banner/banner.module';
import { CategoryModule } from './modules/category/category.module';
import { ColorModule } from './modules/color/color.module';
import { ProductModule } from './modules/product/product.module';
import { ImageModule } from './modules/image/image.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UserModule,
    StoreModule,
    PassportModule.register({ session: true }),
    ContactModule,
    AddressModule,
    BannerModule,
    CategoryModule,
    ColorModule,
    ProductModule,
    ImageModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
