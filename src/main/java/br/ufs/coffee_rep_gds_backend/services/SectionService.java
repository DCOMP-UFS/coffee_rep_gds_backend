package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class SectionService {

    private final SectionRepository sectionRepository;

    public SectionService(SectionRepository sectionRepository) {
        this.sectionRepository = sectionRepository;
    }

    public Page<Section> findAllActive(Pageable pageable) {
        return sectionRepository.findAllByStatus(Status.ACTIVE.value, pageable);
    }
}
