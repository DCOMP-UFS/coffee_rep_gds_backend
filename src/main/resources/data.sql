CREATE EXTENSION IF NOT EXISTS unaccent;

INSERT INTO tb_roles (role_id, name) SELECT 1, 'ADMIN' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 1);
INSERT INTO tb_roles (role_id, name) SELECT 2, 'BASIC' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 2);

INSERT INTO tb_sections (id, name, status) SELECT 1, 'Médica 1', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 1);
INSERT INTO tb_sections (id, name, status) SELECT 2, 'Médica 2', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 2);
INSERT INTO tb_sections (id, name, status) SELECT 3, 'Saúde do adulto', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 3);
INSERT INTO tb_sections (id, name, status) SELECT 4, 'Cirúrgica', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 4);
INSERT INTO tb_sections (id, name, status) SELECT 5, 'Pediatria', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 5);
INSERT INTO tb_sections (id, name, status) SELECT 6, 'Hepatologia', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 6);
INSERT INTO tb_sections (id, name, status) SELECT 7, 'Biomédica', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 7);
INSERT INTO tb_sections (id, name, status) SELECT 8, 'Dermatologia', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 8);
INSERT INTO tb_sections (id, name, status) SELECT 9, 'Nefrologia', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 9);
INSERT INTO tb_sections (id, name, status) SELECT 10, 'Saúde da Mulher', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 10);
INSERT INTO tb_sections (id, name, status) SELECT 11, 'Oncologia', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 11);
INSERT INTO tb_sections (id, name, status) SELECT 12, 'CC Ambulatorial', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 12);

INSERT INTO tb_rooms (id, name, status, section_id) SELECT 1, 'Sala 1', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 1);
INSERT INTO tb_rooms (id, name, status, section_id) SELECT 2, 'Sala 2', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 2);
INSERT INTO tb_rooms (id, name, status, section_id) SELECT 3, 'Sala 3', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 3);
INSERT INTO tb_rooms (id, name, status, section_id) SELECT 4, 'Sala 4', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 4);
INSERT INTO tb_rooms (id, name, status, section_id) SELECT 5, 'Sala 5', 1, 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 5);
INSERT INTO tb_rooms (id, name, status, section_id) SELECT 6, 'Sala 6', 1, 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 6);

INSERT INTO tb_requesters (id, name, cpf, contact_number, status, specialty) SELECT 1, 'João da Silva', '25098719003', '79999887766', 1, 'Cardiologista' WHERE NOT EXISTS(SELECT id FROM tb_requesters WHERE id = 1);
INSERT INTO tb_requesters (id, name, cpf, contact_number, status, specialty) SELECT 2, 'Maria de Souza', '66822603000', '79988776655', 1, 'Pediatra' WHERE NOT EXISTS(SELECT id FROM tb_requesters WHERE id = 2);
INSERT INTO tb_requesters (id, name, cpf, contact_number, status, specialty) SELECT 3, 'Marcos da Cruz', '86362170083', '79912345678', 0, 'Clinico geral' WHERE NOT EXISTS(SELECT id FROM tb_requesters WHERE id = 3);

INSERT INTO tb_reservations (start_date, end_date, observations, room_id, requester_id) SELECT NOW(), NOW() + INTERVAL '2 hours', '', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_reservations WHERE id = 1);


SELECT setval(pg_get_serial_sequence('tb_sections', 'id'), COALESCE(MAX(id), 1)) FROM tb_sections;
SELECT setval(pg_get_serial_sequence('tb_rooms', 'id'), COALESCE(MAX(id), 1)) FROM tb_rooms;
SELECT setval(pg_get_serial_sequence('tb_requesters', 'id'), COALESCE(MAX(id), 1)) FROM tb_requesters;
SELECT setval(pg_get_serial_sequence('tb_reservations', 'id'), COALESCE(MAX(id), 1)) FROM tb_reservations;