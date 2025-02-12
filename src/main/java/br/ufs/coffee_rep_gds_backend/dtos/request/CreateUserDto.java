package br.ufs.coffee_rep_gds_backend.dtos.request;

public record CreateUserDto(
        String name,
        String phone,
        String password,
        String email,
        String cpf,
        String birthDate
) {}
