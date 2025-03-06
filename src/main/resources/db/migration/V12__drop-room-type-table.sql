ALTER TABLE tb_rooms
    DROP CONSTRAINT fk_room_type,
    DROP COLUMN room_type_id;

DROP TABLE tb_room_types;