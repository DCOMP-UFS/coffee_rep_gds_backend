package br.ufs.coffee_rep_gds_backend.dtos.response;

public record RequesterResponseDetailDto(
        String nome,
        String cpf,
        String contato,
        String tipo,
        String cargo
) {}
