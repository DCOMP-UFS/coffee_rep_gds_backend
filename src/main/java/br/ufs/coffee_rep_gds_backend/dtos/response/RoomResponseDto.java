package br.ufs.coffee_rep_gds_backend.dtos.response;

public record RoomResponseDto(
        Long id,
        String nome,
        String tipo,
        String setor,
        Boolean ocupada
) {}
