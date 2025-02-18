package br.ufs.coffee_rep_gds_backend.dtos.request;

import java.time.LocalDateTime;

public record CreateReservationDto(
   Long roomId,
   Long requesterId,
   LocalDateTime startDate,
   LocalDateTime endDate,
   String observations
) {}
