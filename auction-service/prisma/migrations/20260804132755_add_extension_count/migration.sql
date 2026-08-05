-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "extension_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" VARCHAR(30) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "provider_event_id" VARCHAR(255) NOT NULL,
    "provider_payment_id" VARCHAR(255),
    "auction_id" VARCHAR(26),
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "signature_verified" BOOLEAN NOT NULL,
    "processing_result" VARCHAR(255) NOT NULL,
    "correlation_id" VARCHAR(255) NOT NULL,
    "request_id" VARCHAR(255) NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "raw_payload_hash" VARCHAR(255),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_auction_id_idx" ON "webhook_events"("auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "payments_gateway_transaction_id_idx" ON "payments"("gateway_transaction_id");
