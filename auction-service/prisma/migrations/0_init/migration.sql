-- CreateTable
CREATE TABLE "auctions" (
    "id" VARCHAR(26) NOT NULL,
    "shopify_product_id" VARCHAR(255) NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    "starting_price_paise" BIGINT NOT NULL,
    "reserve_price_paise" BIGINT,
    "min_increment_paise" BIGINT NOT NULL,
    "current_price_paise" BIGINT NOT NULL,
    "winning_bid_id" VARCHAR(26),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" VARCHAR(26) NOT NULL,
    "auction_id" VARCHAR(26) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "is_proxy" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" VARCHAR(26) NOT NULL,
    "auction_id" VARCHAR(26) NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "gateway_transaction_id" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL DEFAULT 'HOLD',

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(26) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(26) NOT NULL,
    "actor_id" VARCHAR(128) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "old_state" JSONB,
    "new_state" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" VARCHAR(26) NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(128) NOT NULL,
    "request_payload" JSONB,
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "auctions_shopify_product_id_key" ON "auctions"("shopify_product_id");
CREATE INDEX "auctions_status_end_time_idx" ON "auctions"("status", "end_time" ASC);

-- CreateIndex
CREATE INDEX "bids_auction_id_amount_paise_idx" ON "bids"("auction_id", "amount_paise" DESC);
CREATE INDEX "bids_user_id_created_at_idx" ON "bids"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_transaction_id_key" ON "payments"("gateway_transaction_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at" ASC);

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
