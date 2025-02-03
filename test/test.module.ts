import { Module } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { ValidationService } from '../src/common/validation.service'; // Pastikan import path benar
import { TestService } from './test.service';


@Module({
  providers: [
    TestService,
    AuthService,
    ValidationService,
    {
      provide: 'winston',
      useValue: {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    },
  ],
})
export class TestModule {}
