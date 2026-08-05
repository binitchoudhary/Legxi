-- CreateTable
CREATE TABLE "settlements" (
    "id" VARCHAR(26) NOT NULL,
    "auction_id" VARCHAR(26) NOT NULL,
    "winner_id" VARCHAR(128) NOT NULL,
    "payment_state" VARCHAR(32) NOT NULL,
    "settlement_status" VARCHAR(32) NOT NULL,
    "payment_window_opened_at" TIMESTAMPTZ NOT NULL,
    "payment_attempts" INTEGER NOT NULL DEFAULT 0,
    "provider" VARCHAR(64),
    "provider_payment_id" VARCHAR(255),
    "provider_event_id" VARCHAR(255),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settlements_auction_id_key" ON "settlements"("auction_id");
