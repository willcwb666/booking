-- AlterTable
ALTER TABLE "company" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionInterval" TEXT,
ADD COLUMN     "subscriptionPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;

-- AlterTable
ALTER TABLE "plan" ADD COLUMN     "stripePriceMonthlyId" TEXT,
ADD COLUMN     "stripePriceYearlyId" TEXT,
ADD COLUMN     "stripeProductId" TEXT;
