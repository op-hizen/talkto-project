/*
  Warnings:

  - You are about to drop the column `searchVector` on the `ChatMessage` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ChatMessage_searchVector_gin";

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "searchVector";
