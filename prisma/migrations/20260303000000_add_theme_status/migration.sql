-- CreateEnum
CREATE TYPE "ThemeStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable: Replace is_used boolean with status enum
ALTER TABLE "themes" ADD COLUMN "status" "ThemeStatus" NOT NULL DEFAULT 'PENDING';

-- Migrate existing data: is_used = true -> COMPLETED, is_used = false -> PENDING
UPDATE "themes" SET "status" = 'COMPLETED' WHERE "is_used" = true;
UPDATE "themes" SET "status" = 'PENDING' WHERE "is_used" = false;

-- Drop old column
ALTER TABLE "themes" DROP COLUMN "is_used";
