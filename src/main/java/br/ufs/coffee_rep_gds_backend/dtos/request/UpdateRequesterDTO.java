package br.ufs.coffee_rep_gds_backend.dtos.request;

public record UpdateRequesterDTO(
        String nome,
        String telefone,
        String tipo,
        String cargo
) {
}
