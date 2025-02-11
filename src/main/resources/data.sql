INSERT INTO tb_roles (role_id, name) SELECT 1, 'ADMIN' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 1);
INSERT INTO tb_roles (role_id, name) SELECT 2, 'BASIC' WHERE NOT EXISTS(SELECT role_id FROM tb_roles WHERE role_id = 2);

INSERT INTO tb_sections (id, name, status) SELECT 1, 'Saúde do Adulto', 'ACTIVE' WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 1);
INSERT INTO tb_sections (id, name, status) SELECT 2, 'Cirúrgia', 'ACTIVE' WHERE NOT EXISTS(SELECT id FROM tb_sections WHERE id = 2);

INSERT INTO tb_rooms (id, name, type, status, section_id) SELECT 1, 'Sala 1', 'MEDICAL_OFFICE', 'ACTIVE', 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 1);
INSERT INTO tb_rooms (id, name, type, status, section_id) SELECT 2, 'Sala 2', 'MEDICAL_OFFICE', 'ACTIVE', 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 2);
INSERT INTO tb_rooms (id, name, type, status, section_id) SELECT 3, 'Sala 3', 'MEDICAL_OFFICE', 'ACTIVE', 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 3);
INSERT INTO tb_rooms (id, name, type, status, section_id) SELECT 4, 'Sala 4', 'MEDICAL_OFFICE', 'INACTIVE', 1 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 4);
INSERT INTO tb_rooms (id, name, type, status, section_id) SELECT 5, 'Sala 5', 'MEDICAL_OFFICE', 'ACTIVE', 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 5);
INSERT INTO tb_rooms (id, name, type, status, section_id) SELECT 6, 'Sala 6', 'MEDICAL_OFFICE', 'ACTIVE', 2 WHERE NOT EXISTS(SELECT id FROM tb_rooms WHERE id = 6);