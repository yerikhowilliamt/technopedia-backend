export class BannerResponse {
  id: number;
  storeId: number;
  name: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateBannerRequest {
  storeId: number;
  name: string;
  imageUrl: string;
}

export class UpdateBannerRequest {
  id: number;
  storeId: number;
  name: string;
  imageUrl: string;
}