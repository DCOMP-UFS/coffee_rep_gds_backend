package br.ufs.coffee_rep_gds_backend.dtos.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateRequesterAbsenceDto(
        @NotNull(message = "Informe o profissional.")
        Long solicitanteId,

        @NotNull(message = "Informe a data de início.")
        LocalDate dataInicio,

        @NotNull(message = "Informe a data de fim.")
        LocalDate dataFim
) {
}
