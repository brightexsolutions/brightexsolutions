-- Fix invoices incorrectly marked 'paid' when actual payments sum to less than the invoice total.
-- Root cause: a double-counting bug in the payments POST route added paymentData.amount twice.
-- Invoices with some payments but not full are set to 'partial'; invoices with zero payments
-- are reset to 'sent'.

UPDATE invoices
SET status = CASE
  WHEN (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.invoice_id = invoices.id
      AND p.deleted_at IS NULL
  ) > 0 THEN 'partial'
  ELSE 'sent'
END
WHERE status = 'paid'
  AND deleted_at IS NULL
  AND total > (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.invoice_id = invoices.id
      AND p.deleted_at IS NULL
  );
