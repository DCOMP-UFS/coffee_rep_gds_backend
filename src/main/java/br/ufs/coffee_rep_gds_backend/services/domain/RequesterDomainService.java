package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RequesterDomainService {

    private final RequesterRepository requesterRepository;

    public RequesterDomainService(RequesterRepository requesterRepository) {
        this.requesterRepository = requesterRepository;
    }

    public Requester getRequesterById(Long id) {
        Optional<Requester> optional = requesterRepository.findById(id);

        if (optional.isEmpty()) throw new EntityNotFoundException("Solicitante não encontrado");

        return optional.get();
    }
}
