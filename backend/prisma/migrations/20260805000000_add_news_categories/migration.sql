-- Managed category tags for news articles (admin-curated suggestion list).
CREATE TABLE "NewsCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsCategory_name_key" ON "NewsCategory"("name");

-- Seed the default suggestion tags (matches the previously hardcoded list).
INSERT INTO "NewsCategory" ("name", "updatedAt") VALUES
  ('Health Alert', CURRENT_TIMESTAMP),
  ('Local Health', CURRENT_TIMESTAMP),
  ('Research', CURRENT_TIMESTAMP),
  ('Wellness', CURRENT_TIMESTAMP),
  ('Policy', CURRENT_TIMESTAMP),
  ('Treatment', CURRENT_TIMESTAMP),
  ('Prevention', CURRENT_TIMESTAMP),
  ('Nutrition', CURRENT_TIMESTAMP);
