/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `ChatRoom` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_slug_key" ON "ChatRoom"("slug");

-- CreateIndex
CREATE INDEX "ChatRoom_slug_idx" ON "ChatRoom"("slug");
