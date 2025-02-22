ALTER TABLE tb_users
    ADD COLUMN created_at timestamp default now(),
    ADD COLUMN updated_at timestamp null,
    ADD COLUMN updated_by BIGINT null,
    ADD CONSTRAINT fk_user_user FOREIGN KEY (updated_by) REFERENCES tb_users (user_id);

ALTER TABLE tb_sections
    ADD COLUMN created_at timestamp default now(),
    ADD COLUMN updated_at timestamp null,
    ADD COLUMN updated_by BIGINT null,
    ADD CONSTRAINT fk_section_user FOREIGN KEY (updated_by) REFERENCES tb_users (user_id);

ALTER TABLE tb_room_types
    ADD COLUMN created_at timestamp default now(),
    ADD COLUMN updated_at timestamp null,
    ADD COLUMN updated_by BIGINT null,
    ADD CONSTRAINT fk_room_type_user FOREIGN KEY (updated_by) REFERENCES tb_users (user_id);

ALTER TABLE tb_rooms
    ADD COLUMN created_at timestamp default now(),
    ADD COLUMN updated_at timestamp null,
    ADD COLUMN updated_by BIGINT null,
    ADD CONSTRAINT fk_room_user FOREIGN KEY (updated_by) REFERENCES tb_users (user_id);

ALTER TABLE tb_requester_types
    ADD COLUMN created_at timestamp default now(),
    ADD COLUMN updated_at timestamp null,
    ADD COLUMN updated_by BIGINT null,
    ADD CONSTRAINT fk_requester_type_user FOREIGN KEY (updated_by) REFERENCES tb_users (user_id);

ALTER TABLE tb_requesters
    ADD COLUMN created_at timestamp default now(),
    ADD COLUMN updated_at timestamp null,
    ADD COLUMN updated_by BIGINT null,
    ADD CONSTRAINT fk_requester_user FOREIGN KEY (updated_by) REFERENCES tb_users (user_id);

ALTER TABLE tb_reservations
    ADD COLUMN created_at timestamp default now(),
    ADD COLUMN updated_at timestamp null,
    ADD COLUMN updated_by BIGINT null,
    ADD CONSTRAINT fk_reservation_user FOREIGN KEY (updated_by) REFERENCES tb_users (user_id);