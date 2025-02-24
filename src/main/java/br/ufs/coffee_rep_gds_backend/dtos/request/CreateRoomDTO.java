package br.ufs.coffee_rep_gds_backend.dtos.request;

public record CreateRoomDTO(
        String nome,
        String tipo,
        Long setorId
) {}
