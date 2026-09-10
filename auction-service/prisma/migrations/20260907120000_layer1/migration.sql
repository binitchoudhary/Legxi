-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PREPARING', 'LIVE', 'EXTENDED', 'ENDING', 'ENDED', 'SETTLED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "extension_duration_sec" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "extension_threshold_sec" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "max_extensions" INTEGER NOT NULL DEFAULT 50;

-- Safe ENUM Conversion for "status"
UPDATE "auctions" SET "status" = 'DRAFT' WHERE "status" NOT IN ('DRAFT', 'SCHEDULED', 'PREPARING', 'LIVE', 'EXTENDED', 'ENDING', 'ENDED', 'SETTLED', 'ARCHIVED');
ALTER TABLE "auctions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "auctions" ALTER COLUMN "status" TYPE "AuctionStatus" USING "status"::text::"AuctionStatus";
ALTER TABLE "auctions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "bids" DROP COLUMN "status";

-- CreateTable
CREATE TABLE "bid_intents" (
    "intent_id" VARCHAR(36) NOT NULL,
    "auction_id" VARCHAR(26) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "bid_id" VARCHAR(26),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bid_intents_pkey" PRIMARY KEY ("intent_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bid_intents_bid_id_key" ON "bid_intents"("bid_id");

-- CreateIndex
CREATE INDEX "bid_intents_created_at_idx" ON "bid_intents"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "auctions_winning_bid_id_key" ON "auctions"("winning_bid_id");



-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winning_bid_id_fkey" FOREIGN KEY ("winning_bid_id") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_intents" ADD CONSTRAINT "bid_intents_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_intents" ADD CONSTRAINT "bid_intents_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
