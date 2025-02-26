package br.ufs.coffee_rep_gds_backend.dtos.response;

public record CreateRequesterResponseDTO(
        Long id,
        String nome,
        String cpf,
        String telefone,
        String especialidade
) {}
