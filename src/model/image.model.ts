export class ImageResponse {
  id: number;
  productId: number;
  publicId: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateImageRequest {
  productId: number;
}

export class UpdateImageRequest {
  id: number;
  productId: number;
  publicId: number;
}