package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateSectionDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateSectionResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.SectionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/section")
@Tag(name = "SectionController", description = "Controller para Setor")
public class SectionController {

    private final SectionService sectionService;

    public SectionController(SectionService sectionService) {
        this.sectionService = sectionService;
    }

    @GetMapping
    public ResponseEntity<?> getAllSections(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean unpaged,
            Pageable pageable
    ) {
        if (unpaged != null && unpaged) {
            List<SectionResponseDto> allActive = sectionService.findAllActive(name);
            return ResponseEntity.ok(allActive);
        }
        Page<SectionResponseDto> allActive = sectionService.findAllActive(name, pageable);
        return ResponseEntity.ok(allActive);
    }

    @PostMapping
    public ResponseEntity<CreateSectionResponseDTO> createSection(@RequestBody @Valid CreateSectionDTO dto) {
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
