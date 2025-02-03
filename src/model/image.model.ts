export class ImageResponse {
  id: number;
  productId: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateImageRequest {
  productId: number;
  url: string;
}

export class UpdateImageRequest {
  id: number;
  productId: number;
  url: string;
}