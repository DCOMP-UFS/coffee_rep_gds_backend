package br.ufs.coffee_rep_gds_backend.dtos.request;

public record LoginRequest(
        String cpf,
        String password
) {}
