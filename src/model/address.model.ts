export class AddressResponse {
  id: number;
  userId: number;
  street: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CreateAddressRequest {
  userId: number;
  street: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  isPrimary: boolean;
}

export class UpdateAddressRequest {
  id: number;
  userId: number;
  street: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  isPrimary: boolean;
}

export class DeleteAddressRequest {
  id: number;
  userId: number;
}