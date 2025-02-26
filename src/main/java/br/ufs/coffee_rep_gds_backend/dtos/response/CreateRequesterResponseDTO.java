package br.ufs.coffee_rep_gds_backend.dtos.response;

public record CreateRequesterResponseDTO(
        String nome,
        String cpf,
        String telefone,
        String tipo,
        String cargo
) {}
