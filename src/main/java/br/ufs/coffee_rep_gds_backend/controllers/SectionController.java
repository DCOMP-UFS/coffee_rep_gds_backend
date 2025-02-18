package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.services.SectionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/section")
public class SectionController {

    private final SectionService sectionService;

    public SectionController(SectionService sectionService) {
        this.sectionService = sectionService;
    }

    @GetMapping
    public Page<SectionResponseDto> getAllSections(Pageable pageable) {
        Page<Section> allByStatus = sectionService.findAllActive(pageable);

        var all = allByStatus.stream().map(section -> {return new SectionResponseDto(section.getId(), section.getName(), section.getObservations());}).toList();
        return new PageImpl<>(all, pageable, allByStatus.getTotalElements());
    }
}
