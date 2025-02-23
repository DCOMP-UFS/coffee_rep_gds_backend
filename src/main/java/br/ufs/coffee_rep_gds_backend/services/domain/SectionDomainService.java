package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SectionDomainService {

    private final SectionRepository sectionRepository;

    public SectionDomainService(SectionRepository sectionRepository) {
        this.sectionRepository = sectionRepository;
    }

    public Optional<Section> findByName(String name) {
        return sectionRepository.findAllByName(name);
    }
}
