-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('SALES', 'DEBT');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "storeType" "StoreType" NOT NULL DEFAULT 'SALES';

-- My Santex Qarz do'konini DEBT tipiga o'zgartirish
UPDATE stores SET "storeType" = 'DEBT' WHERE name ILIKE '%qarz%';
