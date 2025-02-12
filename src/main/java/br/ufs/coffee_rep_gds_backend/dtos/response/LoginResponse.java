package br.ufs.coffee_rep_gds_backend.dtos.response;

public record LoginResponse(String accessToken, Long expiresIn) {
}
