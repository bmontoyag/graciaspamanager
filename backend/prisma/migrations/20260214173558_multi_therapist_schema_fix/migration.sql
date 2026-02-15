/*
  Warnings:

  - You are about to drop the column `workerId` on the `Attention` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attention" DROP CONSTRAINT "Attention_workerId_fkey";

-- AlterTable
ALTER TABLE "Attention" DROP COLUMN "workerId";

-- CreateTable
CREATE TABLE "AttentionWorker" (
    "id" SERIAL NOT NULL,
    "attentionId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttentionWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttentionWorker_attentionId_workerId_key" ON "AttentionWorker"("attentionId", "workerId");

-- AddForeignKey
ALTER TABLE "AttentionWorker" ADD CONSTRAINT "AttentionWorker_attentionId_fkey" FOREIGN KEY ("attentionId") REFERENCES "Attention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttentionWorker" ADD CONSTRAINT "AttentionWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
