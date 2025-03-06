package br.ufs.coffee_rep_gds_backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateRoomDTO(

        @NotEmpty(message = "O nome da sala deve ser preenchida!")
        @NotBlank(message = "O nome da sala não deve ser deixada em branco!")
        String nome,

        @NotNull(message = "O ID do setor deve ser preenchido!")
        Long setorId
) {}
