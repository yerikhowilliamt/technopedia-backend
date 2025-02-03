-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_user_id_idx" ON "banners"("user_id");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
