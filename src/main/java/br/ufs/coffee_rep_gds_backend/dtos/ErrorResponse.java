package br.ufs.coffee_rep_gds_backend.dtos;

public record ErrorResponse(
        Integer status,
        String error,
        String message,
        String path
) {}
