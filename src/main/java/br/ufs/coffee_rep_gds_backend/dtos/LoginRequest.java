package br.ufs.coffee_rep_gds_backend.dtos;

public record LoginRequest(
        String cpf,
        String password
) {}
