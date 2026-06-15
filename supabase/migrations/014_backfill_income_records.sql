-- Backfill income_records for all payments that don't already have one.
-- Previous inserts failed silently because the old code passed a non-existent
-- 'added_by' column; this migration recovers all historical payment data.

INSERT INTO income_records (
  source,
  description,
  client_id,
  payment_id,
  amount,
  currency,
  date,
  category,
  tax_applicable
)
SELECT
  'invoice_payment'                                                     AS source,
  'Payment for invoice ' || COALESCE(i.invoice_number, p.id::text)     AS description,
  i.client_id                                                           AS client_id,
  p.id                                                                  AS payment_id,
  p.amount,
  'KES'                                                                 AS currency,
  COALESCE(p.date, p.created_at::date)                                  AS date,
  'service_revenue'                                                     AS category,
  true                                                                  AS tax_applicable
FROM payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM income_records ir
    WHERE ir.payment_id = p.id
      AND ir.deleted_at IS NULL
  );

GRANT ALL ON income_records TO service_role;
