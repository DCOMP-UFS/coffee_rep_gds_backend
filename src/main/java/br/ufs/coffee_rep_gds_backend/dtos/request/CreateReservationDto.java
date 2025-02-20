package br.ufs.coffee_rep_gds_backend.dtos.request;

import java.time.LocalDateTime;

public record CreateReservationDto(
   Long salaId,
   Long solicitanteId,
   LocalDateTime horaInicio,
   LocalDateTime horaFim,
   String observacoes
) {}
