package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class SectionService {

    private final SectionRepository sectionRepository;

    public SectionService(SectionRepository sectionRepository) {
        this.sectionRepository = sectionRepository;
    }

    public Page<SectionResponseDto> findAllActive(Pageable pageable) {
        Page<Section> allByStatus = sectionRepository.findAllByStatus(Status.ACTIVE, pageable);
        var all = allByStatus.stream().map(section -> {return new SectionResponseDto(section.getId(), section.getName(), section.getObservations());}).toList();
        return new PageImpl<>(all, pageable, allByStatus.getTotalElements());
    }
}
