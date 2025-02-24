package br.ufs.coffee_rep_gds_backend.dtos.response;

public record CreateRoomResponseDTO(
        Long id,
        String nome,
        String setor,
        String tipo
) {}
