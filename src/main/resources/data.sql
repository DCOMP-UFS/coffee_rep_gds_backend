INSERT INTO tb_roles (role_id, name) SELECT 1, 'ADMIN' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 1);
INSERT INTO tb_roles (role_id, name) SELECT 2, 'BASIC' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 2);

INSERT INTO tb_sections (id, name, status) SELECT 1, 'Saúde do Adulto', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 1);
INSERT INTO tb_sections (id, name, status) SELECT 2, 'Cirúrgia', 1 WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 2);

INSERT INTO tb_room_type (id, name, status) SELECT 1, 'Ambulatório', 1 WHERE NOT EXISTS(SELECT id FROM tb_room_type WHERE id = 1);

INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 1, 'Sala 1', 1, 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 1);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 2, 'Sala 2', 1, 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 2);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 3, 'Sala 3', 1, 1, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 3);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 4, 'Sala 4', 1, 0, 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 4);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 5, 'Sala 5', 1, 1, 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 5);
INSERT INTO tb_rooms (id, name, room_type_id, status, section_id) SELECT 6, 'Sala 6', 1, 1, 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 6);