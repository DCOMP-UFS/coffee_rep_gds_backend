package br.ufs.coffee_rep_gds_backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.hibernate.validator.constraints.br.CPF;

public record CreateRequesterDTO(
        @NotEmpty(message = "O nome do solicitante deve ser preenchido!")
        @NotBlank(message = "O nome do solicitante não deve ser deixado em branco!")
        String nome,

        @CPF(message = "Por favor, insira um CPF no formato correto!")
        @NotEmpty(message = "O CPF deve ser preenchido!")
        String cpf,

        String telefone,

        @NotEmpty(message = "O tipo de requisitante deve ser preenchido!")
        @NotBlank(message = "O tipo de requisitante não deve ser deixado em branco!")
        String tipo,

        String cargo
) {}
