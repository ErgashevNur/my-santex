-- AlterTable
ALTER TABLE "debt_transactions" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "debt_transactions_userId_idx" ON "debt_transactions"("userId");

-- AddForeignKey
ALTER TABLE "debt_transactions" ADD CONSTRAINT "debt_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
