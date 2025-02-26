package br.ufs.coffee_rep_gds_backend.dtos.response;

import java.util.Map;

public record ErrorValidationResponse(
        Integer status,
        String message,
        String path,
        Map<String, String> errors
) {
}
