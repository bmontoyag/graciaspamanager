-- DATA MIGRATION SCRIPT (Run after npx prisma db push)
-- This script ensures that existing appointments preserve their therapist relationship
-- by migrating data from the Appointment table to the new AppointmentWorker junction table.

-- 1. Migration of existing workers to the new junction table
INSERT INTO "AppointmentWorker" ("appointmentId", "workerId", "isPrimary", "createdAt", "updatedAt")
SELECT id, "workerId", true, NOW(), NOW()
FROM "Appointment"
WHERE "workerId" IS NOT NULL
ON CONFLICT ("appointmentId", "workerId") DO NOTHING;

-- 2. Update Configuration defaults for loyalty points (if not already set)
UPDATE "Configuration" 
SET "loyaltyPointsToRedeem" = 10 
WHERE "loyaltyPointsToRedeem" IS NULL;

-- 3. Cleanup (Optional: If you want to force existing loyalty points to the new field name if it was different)
-- This shouldn't be necessary if db push handled the rename correctly, but added for safety.
-- UPDATE "Configuration" SET "loyaltyPointsToRedeem" = "maxLoyaltyPointsRedeemable" WHERE "loyaltyPointsToRedeem" IS NULL AND "maxLoyaltyPointsRedeemable" IS NOT NULL;
