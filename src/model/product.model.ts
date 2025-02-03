export class ProductResponse {
  id: number;
  storeId: number;
  categoryId: number;
  colorId: number;
  name: string;
  price: string;
  isFeatured: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CreateProductRequest {
  storeId: number;
  categoryId: number;
  colorId: number;
  name: string;
  price: string;
  imageUrl: string[];
  isFeatured: boolean;
  isArchived: boolean;
}

export class UpdateProductRequest {
  id: number;
  storeId: number;
  categoryId: number;
  colorId: number;
  name: string;
  price: string;
  isFeatured: boolean;
  isArchived: boolean;
}