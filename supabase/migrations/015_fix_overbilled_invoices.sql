-- Reset invoices incorrectly marked 'paid' when actual payments sum to less than the invoice total.
-- Root cause: a double-counting bug in the payments POST route added paymentData.amount twice,
-- making a half-payment appear to fully settle the invoice.

UPDATE invoices
SET status = 'sent'
WHERE status = 'paid'
  AND deleted_at IS NULL
  AND total > (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.invoice_id = invoices.id
      AND p.deleted_at IS NULL
  );
