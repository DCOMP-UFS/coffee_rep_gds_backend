package br.ufs.coffee_rep_gds_backend.dtos.response;

public record RequesterResponseDetailDto(
        Long id,
        String nome,
        String contato,
        String especialidade
) {}
