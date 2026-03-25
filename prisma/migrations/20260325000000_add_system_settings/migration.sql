-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- Seed default values
INSERT INTO "system_settings" ("key", "value", "updated_at") VALUES ('themes_per_page', '20', CURRENT_TIMESTAMP);
