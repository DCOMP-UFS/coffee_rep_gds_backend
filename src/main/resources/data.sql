INSERT INTO tb_roles (role_id, name) SELECT 1, 'ADMIN' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 1);
INSERT INTO tb_roles (role_id, name) SELECT 2, 'BASIC' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 2);

INSERT INTO tb_sections (id, name, status) SELECT 1, 'Saúde do Adulto', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 1);
INSERT INTO tb_sections (id, name, status) SELECT 2, 'Cirúrgia', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 2);

INSERT INTO tb_room_types (id, name, status) SELECT 1, 'Ambulatório', 1 WHERE NOT EXISTS(SELECT id FROM tb_room_types WHERE id = 1);

INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 1, 'Sala 1', 1, 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 1);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 2, 'Sala 2', 1, 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 2);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 3, 'Sala 3', 1, 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 3);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 4, 'Sala 4', 1, 0, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 4);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 5, 'Sala 5', 1, 1, 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 5);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 6, 'Sala 6', 1, 1, 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 6);

INSERT INTO tb_requester_types (id, name, position, status) SELECT 1, 'Funcionário', 'Cardiologista', 1 WHERE NOT EXISTS(SELECT id FROM tb_requester_types WHERE id = 1);

INSERT INTO tb_requesters (id, name, cpf, contact_number, status, requester_type_id) SELECT 1, 'João da Silva', '25098719003', '79999887766', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_requesters WHERE id = 1);
INSERT INTO tb_requesters (id, name, cpf, contact_number, status, requester_type_id) SELECT 2, 'Maria de Souza', '66822603000', '79988776655', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_requesters WHERE id = 2);
INSERT INTO tb_requesters (id, name, cpf, contact_number, status, requester_type_id) SELECT 3, 'Marcos da Cruz', '86362170083', '79912345678', 0, 1 WHERE NOT EXISTS(SELECT id FROM tb_requesters WHERE id = 3);

INSERT INTO tb_reservations (start_date, end_date, observations, room_id, requester_id) SELECT NOW(), NOW() + INTERVAL '2 hours', '', 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_reservations WHERE id = 1);