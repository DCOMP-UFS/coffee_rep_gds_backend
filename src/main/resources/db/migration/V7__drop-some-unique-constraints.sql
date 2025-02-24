ALTER TABLE tb_rooms
    DROP CONSTRAINT tb_rooms_name_key;

ALTER TABLE tb_requester_types
    DROP CONSTRAINT tb_requester_types_name_key,
    DROP CONSTRAINT tb_requester_types_position_key;