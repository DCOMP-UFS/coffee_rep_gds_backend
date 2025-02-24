package br.ufs.coffee_rep_gds_backend.dtos.response;

public record CreateSectionResponseDTO(
        Long id,
        String nome,
        String observacao
) {}
