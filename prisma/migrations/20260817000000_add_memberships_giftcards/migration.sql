-- CreateTable
CREATE TABLE "membership_plan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "includedSessionsCount" INTEGER,
    "discountPercent" DECIMAL(5,2) DEFAULT 0,
    "serviceIdsJson" TEXT,
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_membership" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewsAt" TIMESTAMP(3),
    "remainingSessions" INTEGER,
    "stripeSubscriptionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_usage" (
    "id" TEXT NOT NULL,
    "customerMembershipId" TEXT NOT NULL,
    "bookingId" TEXT,
    "serviceName" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "membership_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" DECIMAL(10,2) NOT NULL,
    "currentBalance" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "buyerName" TEXT,
    "buyerEmail" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_redemption" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "bookingId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "gift_card_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_plan_companyId_isActive_idx" ON "membership_plan"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "customer_membership_companyId_customerEmail_idx" ON "customer_membership"("companyId", "customerEmail");

-- CreateIndex
CREATE INDEX "customer_membership_companyId_status_idx" ON "customer_membership"("companyId", "status");

-- CreateIndex
CREATE INDEX "membership_usage_customerMembershipId_idx" ON "membership_usage"("customerMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_card_code_key" ON "gift_card"("code");

-- CreateIndex
CREATE INDEX "gift_card_companyId_status_idx" ON "gift_card"("companyId", "status");

-- CreateIndex
CREATE INDEX "gift_card_companyId_code_idx" ON "gift_card"("companyId", "code");

-- CreateIndex
CREATE INDEX "gift_card_redemption_giftCardId_idx" ON "gift_card_redemption"("giftCardId");

-- AddForeignKey
ALTER TABLE "membership_plan" ADD CONSTRAINT "membership_plan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_membership" ADD CONSTRAINT "customer_membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_membership" ADD CONSTRAINT "customer_membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage" ADD CONSTRAINT "membership_usage_customerMembershipId_fkey" FOREIGN KEY ("customerMembershipId") REFERENCES "customer_membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card" ADD CONSTRAINT "gift_card_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_redemption" ADD CONSTRAINT "gift_card_redemption_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

