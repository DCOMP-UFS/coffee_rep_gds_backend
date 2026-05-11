package br.ufs.coffee_rep_gds_backend.dtos.response;

import java.time.LocalDateTime;

public record ReservationResponseDto(
        Long reservationId,
        java.time.LocalDateTime horaInicio,
        java.time.LocalDateTime horaFim,
        String sala,
        String solicitante,
        String setor,
        String criador,
        Long salaId,
        Long solicitanteId,
        Long setorId,
        Long recorrenciaId,
        Boolean profissionalAusente
) {}
