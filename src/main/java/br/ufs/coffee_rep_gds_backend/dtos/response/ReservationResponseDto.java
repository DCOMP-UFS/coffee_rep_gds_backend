package br.ufs.coffee_rep_gds_backend.dtos.response;

import java.time.LocalDateTime;

public record ReservationResponseDto(
        LocalDateTime horaInicio,
        LocalDateTime horaFim,
        String sala,
        String solicitante,
        String setor,
        Long salaId,
        Long solicitanteId,
        Long setorId
) {}
