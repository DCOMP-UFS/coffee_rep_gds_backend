ALTER TABLE tb_requesters
ADD UNIQUE (cpf);

ALTER TABLE tb_sections
ADD UNIQUE (name);

ALTER TABLE tb_rooms
ADD UNIQUE (name);

ALTER TABLE tb_room_types
ADD UNIQUE (name);

ALTER TABLE tb_requester_types
ADD UNIQUE (name),
ADD UNIQUE (position);

