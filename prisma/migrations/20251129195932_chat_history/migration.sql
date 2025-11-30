-- CreateEnum
CREATE TYPE "ChatMessageHistoryType" AS ENUM ('EDIT', 'DELETE');

-- CreateTable
CREATE TABLE "ChatMessageHistory" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ChatMessageHistoryType" NOT NULL,
    "editedById" TEXT,

    CONSTRAINT "ChatMessageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessageHistory_messageId_idx" ON "ChatMessageHistory"("messageId");

-- CreateIndex
CREATE INDEX "ChatMessageHistory_editedById_idx" ON "ChatMessageHistory"("editedById");

-- AddForeignKey
ALTER TABLE "ChatMessageHistory" ADD CONSTRAINT "ChatMessageHistory_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageHistory" ADD CONSTRAINT "ChatMessageHistory_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
