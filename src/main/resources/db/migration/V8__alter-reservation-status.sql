ALTER TABLE tb_reservations ADD COLUMN status_temp INT;

UPDATE tb_reservations
SET status_temp = CASE
    WHEN status = 'Aprovada' THEN 1
    WHEN status = 'Cancelada' THEN 2
    ELSE 0
END;

ALTER TABLE tb_reservations DROP COLUMN status;

ALTER TABLE tb_reservations RENAME COLUMN status_temp TO status;

ALTER TABLE tb_reservations
    ADD CONSTRAINT chk_status CHECK (status IN (1, 2));

ALTER TABLE tb_reservations
    ALTER COLUMN status SET DEFAULT 1;