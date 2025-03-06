package br.ufs.coffee_rep_gds_backend.dtos.request;

import org.hibernate.validator.constraints.br.CPF;

public record UpdateRequesterDTO(
        String nome,

        @CPF(message = "Por favor, insira um CPF válido!")
        String cpf,
        String telefone,
        String especialidade
) {
}
