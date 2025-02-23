package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateSectionDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateSectionResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.SectionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/section")
public class SectionController {

    private final SectionService sectionService;

    public SectionController(SectionService sectionService) {
        this.sectionService = sectionService;
    }

    @GetMapping
    public Page<SectionResponseDto> getAllSections(
            @RequestParam(required = false) String name,
            Pageable pageable
    ) {
        return sectionService.findAllActive(name, pageable);
    }

    @PostMapping
    public ResponseEntity<CreateSectionResponseDTO> createSection(@RequestBody CreateSectionDTO dto) {
        CreateSectionResponseDTO createSectionResponseDTO = sectionService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createSectionResponseDTO);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CreateSectionResponseDTO> updateSection(@PathVariable Long id, @RequestBody CreateSectionDTO dto) {
        CreateSectionResponseDTO updated = sectionService.update(id, dto);
        return ResponseEntity.status(HttpStatus.OK).body(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSection(@PathVariable Long id) {
        sectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
