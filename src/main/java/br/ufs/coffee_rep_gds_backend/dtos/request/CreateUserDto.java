package br.ufs.coffee_rep_gds_backend.dtos.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.br.CPF;

public record CreateUserDto(
        @NotBlank String name,
        @NotBlank String phone,
        @NotBlank String password,
        @NotBlank @Email String email,
        @CPF @NotBlank String cpf,
        @NotBlank String birthDate
) {}
