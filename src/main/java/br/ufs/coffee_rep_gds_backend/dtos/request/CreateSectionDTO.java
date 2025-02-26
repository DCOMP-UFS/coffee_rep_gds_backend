package br.ufs.coffee_rep_gds_backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public record CreateSectionDTO(
        @NotEmpty(message = "O nome do setor deve ser preenchido!")
        @NotBlank(message = "O nome do setor não deve ser deixado em branco!")
        String nome,

        String observacao
) {}
