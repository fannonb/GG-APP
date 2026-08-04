UPDATE "Transaction"
SET status = 'AUTHORIZED'
WHERE status IN ('PENDING', 'COMPLETED');
