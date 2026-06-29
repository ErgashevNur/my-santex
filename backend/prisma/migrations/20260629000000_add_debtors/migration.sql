-- CreateEnum
CREATE TYPE "DebtTxType" AS ENUM ('DEBT', 'PAYMENT');

-- CreateTable
CREATE TABLE "debtors" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "totalDebt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debtors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_transactions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "debtorId" TEXT NOT NULL,
    "type" "DebtTxType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debtors_storeId_idx" ON "debtors"("storeId");

-- CreateIndex
CREATE INDEX "debt_transactions_debtorId_idx" ON "debt_transactions"("debtorId");

-- CreateIndex
CREATE INDEX "debt_transactions_storeId_idx" ON "debt_transactions"("storeId");

-- AddForeignKey
ALTER TABLE "debtors" ADD CONSTRAINT "debtors_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_transactions" ADD CONSTRAINT "debt_transactions_debtorId_fkey" FOREIGN KEY ("debtorId") REFERENCES "debtors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
