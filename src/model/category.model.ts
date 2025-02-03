export class CategoryResponse {
  id: number;
  storeId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateCategoryRequest {
  storeId: number;
  name: string;
}

export class UpdateCategoryRequest {
  id: number;
  storeId: number;
  name: string;
}