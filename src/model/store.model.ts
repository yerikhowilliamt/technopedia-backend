export class StoreResponse {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateStoreRequest {
  userId: number;
  name: string;
}

export class UpdateStoreRequest {
  id: number;
  userId: number;
  name: string;
} 