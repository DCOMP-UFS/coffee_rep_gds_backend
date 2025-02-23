package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import br.ufs.coffee_rep_gds_backend.specifications.SectionSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class SectionService {

    private final SectionRepository sectionRepository;

    public SectionService(SectionRepository sectionRepository) {
        this.sectionRepository = sectionRepository;
    }

    public Page<SectionResponseDto> findAllActive(String name, Pageable pageable) {
        Specification<Section> spec = SectionSpecification.filter(name);
        Page<Section> allByStatus = sectionRepository.findAllByStatus(Status.ACTIVE.value, spec, pageable);

        var all = allByStatus.stream().map(section -> new SectionResponseDto(
                section.getId(),
                section.getName(),
                section.getObservations())
        ).toList();
        return new PageImpl<>(all, pageable, allByStatus.getTotalElements());
    }
}
