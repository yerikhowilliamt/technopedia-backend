export class ColorResponse {
  id: number;
  storeId: number;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateColorRequest {
  storeId: number;
  name: string;
  value: string;
}

export class UpdateColorRequest {
  id: number;
  storeId: number;
  name: string;
  value: string;
}