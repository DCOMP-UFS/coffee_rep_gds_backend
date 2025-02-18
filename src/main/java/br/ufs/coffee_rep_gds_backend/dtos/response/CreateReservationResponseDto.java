package br.ufs.coffee_rep_gds_backend.dtos.response;

import java.time.LocalDateTime;

public record CreateReservationResponseDto(
        Long id,
        LocalDateTime startDate,
        LocalDateTime endDate,
        String requesterName,
        String roomName
) {}
