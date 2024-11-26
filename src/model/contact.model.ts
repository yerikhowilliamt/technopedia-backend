export class ContactResponse {
  id: number;
  userId: number;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateContactRequest {
  userId: number;
  phone: string;
}

export class UpdateContactRequest {
  id: number;
  userId: number;
  phone: string;
}