import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { StoreModule } from './modules/store/store.module';
import { PassportModule } from '@nestjs/passport';
import { ContactModule } from './modules/contact/contact.module';
import { AddressModule } from './modules/address/address.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UserModule,
    StoreModule,
    PassportModule.register({ session: true }),
    ContactModule,
    AddressModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
