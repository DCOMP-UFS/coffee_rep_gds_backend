ALTER TABLE tb_requesters
    DROP CONSTRAINT fk_requester_type,
    DROP COLUMN requester_type_id,
    ADD COLUMN specialty VARCHAR(40);

DROP TABLE tb_requester_types;