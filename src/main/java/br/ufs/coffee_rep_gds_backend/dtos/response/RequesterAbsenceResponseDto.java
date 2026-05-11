package br.ufs.coffee_rep_gds_backend.dtos.response;

import java.time.LocalDate;

public record RequesterAbsenceResponseDto(
        Long id,
        Long solicitanteId,
        String solicitanteNome,
        LocalDate dataInicio,
        LocalDate dataFim
) {
}
