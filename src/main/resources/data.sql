CREATE EXTENSION IF NOT EXISTS unaccent;

INSERT INTO tb_roles (role_id, name) SELECT 1, 'ADMIN' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 1);
INSERT INTO tb_roles (role_id, name) SELECT 2, 'BASIC' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 2);

SELECT setval(pg_get_serial_sequence('tb_sections', 'id'), COALESCE(MAX(id), 1)) FROM tb_sections;
SELECT setval(pg_get_serial_sequence('tb_rooms', 'id'), COALESCE(MAX(id), 1)) FROM tb_rooms;
SELECT setval(pg_get_serial_sequence('tb_requesters', 'id'), COALESCE(MAX(id), 1)) FROM tb_requesters;
SELECT setval(pg_get_serial_sequence('tb_reservations', 'id'), COALESCE(MAX(id), 1)) FROM tb_reservations;