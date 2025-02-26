package br.ufs.coffee_rep_gds_backend.dtos.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record CreateReservationDto(
    @NotNull(message = "O ID da sala deve ser preenchido!")
    Long salaId,

    @NotNull(message = "O ID do solicitante deve ser preenchido!")
    Long solicitanteId,

    @NotNull(message = "A hora de ínicio deve ser preenchida!")
    LocalDateTime horaInicio,

    @NotNull(message = "A hora de fim deve ser preenchida!")
    LocalDateTime horaFim,

    String observacoes
) {}
