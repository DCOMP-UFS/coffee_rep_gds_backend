package br.ufs.coffee_rep_gds_backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public record CreateRequesterDTO(
        @NotEmpty(message = "O nome do solicitante deve ser preenchido!")
        @NotBlank(message = "O nome do solicitante não deve ser deixado em branco!")
        String nome,

        String telefone,

        @NotEmpty(message = "A especialiade deve ser preenchida!")
        @NotBlank(message = "A especialidade não deve ser deixada em branco!")
        String especialidade
) {}
