package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDetailDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import br.ufs.coffee_rep_gds_backend.specifications.RequesterSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RequesterService {

    private final RequesterRepository requesterRepository;

    public RequesterService(RequesterRepository requesterRepository) {
        this.requesterRepository = requesterRepository;
    }

    public Page<RequesterResponseDto> getAllRequesters(String name, String cpf, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name, cpf);
        Page<Requester> requesterPage = requesterRepository.findAllByStatus(Status.ACTIVE.value, specification, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getName(),
                req.getRequesterType().getName(),
                req.getRequesterType().getPosition())).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }

    public RequesterResponseDetailDto getRequesterById(Long id) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado");

        var requester = optional.get();
        return new RequesterResponseDetailDto(
                requester.getName(),
                requester.getCpf(),
                requester.getContact_number(),
                requester.getRequesterType().getName(),
                requester.getRequesterType().getPosition());
    }

    public Page<RequesterResponseDto> getRequestersByRequesterTypeId(Long requesterTypeId, String name, String cpf, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name, cpf);
        Page<Requester> requesterPage = requesterRepository.findAllByRequesterTypeId(requesterTypeId, specification, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getName(),
                req.getRequesterType().getName(),
                req.getRequesterType().getPosition())).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }
}
