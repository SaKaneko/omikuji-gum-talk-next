-- AlterTable: Add display_name and email columns to users table
ALTER TABLE "users" ADD COLUMN "display_name" VARCHAR NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "email" VARCHAR;

-- Populate display_name with existing name values
UPDATE "users" SET "display_name" = "name";

-- Remove the default after population
ALTER TABLE "users" ALTER COLUMN "display_name" DROP DEFAULT;

-- Add unique constraint to name (login ID)
ALTER TABLE "users" ADD CONSTRAINT "users_name_key" UNIQUE ("name");
