package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import br.ufs.coffee_rep_gds_backend.specifications.RequesterSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RequesterService {

    private final RequesterRepository requesterRepository;

    public RequesterService(RequesterRepository requesterRepository) {
        this.requesterRepository = requesterRepository;
    }

    public Page<Requester> getAllRequesters(String name, String cpf, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name, cpf);
        return requesterRepository.findAllByStatus(Status.ACTIVE.value, specification, pageable);
    }

    public Requester getRequesterById(Long id) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado");

        return optional.get();
    }

    public Page<Requester> getRequestersByRequesterTypeId(Long requesterTypeId, String name, String cpf, Pageable pageable) {
        Specification<Requester> specification = RequesterSpecification.all(name, cpf);
        return requesterRepository.findAllByRequesterTypeId(requesterTypeId, specification, pageable);
    }
}
