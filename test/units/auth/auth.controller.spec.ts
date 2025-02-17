import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthController } from 'src/modules/auth/auth.controller'
import { AuthService } from 'src/modules/auth/auth.service'
import { Logger } from 'winston';

describe('AuhtController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let logger: Logger;

  beforeEach( async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn()
    };

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger
        }
      ]
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    logger = module.get<Logger>(WINSTON_MODULE_NEST_PROVIDER);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => { 
    it('should register a user successfully', async () => {
      const request = {

      }
    });
   })
});