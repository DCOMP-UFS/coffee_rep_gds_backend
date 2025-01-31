package br.ufs.coffee_rep_gds_backend.dtos;

public record CreateUserDto(
        String username,
        String password,
        String email,
        String cpf,
        String birthDate,
        String position
) {}
