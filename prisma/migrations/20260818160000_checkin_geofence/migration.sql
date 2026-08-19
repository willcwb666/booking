-- Check-in por proximidade: coordenadas reais por empresa.
-- Sem elas o geofence comparava a posição do cliente com um ponto fixo em
-- Curitiba, reprovando qualquer empresa fora daquela cidade. Nulo = geofence
-- desligado para a empresa (valida só a janela de horário).
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "checkinRadiusMeters" INTEGER NOT NULL DEFAULT 250;

-- Registro da chegada. Antes o check-in não persistia nada, então "já fez
-- check-in" era um estado inalcançável.
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
