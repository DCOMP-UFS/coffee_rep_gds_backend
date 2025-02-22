package br.ufs.coffee_rep_gds_backend.dtos.response;

public record RequesterResponseDto(
        Long id,
        String nome,
        String tipo,
        String cargo
) {}
