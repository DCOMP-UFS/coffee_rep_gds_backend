package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterAbsenceDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterAbsenceResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.RequesterAbsenceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requester-absence")
@Tag(name = "RequesterAbsenceController", description = "Ausências / férias do profissional (solicitante)")
public class RequesterAbsenceController {

    private final RequesterAbsenceService absenceService;

    public RequesterAbsenceController(RequesterAbsenceService absenceService) {
        this.absenceService = absenceService;
    }

    @GetMapping
    public List<RequesterAbsenceResponseDto> list(@RequestParam(required = false) Long solicitanteId) {
        return absenceService.findAll(solicitanteId);
    }

    @PostMapping
    public ResponseEntity<RequesterAbsenceResponseDto> create(@RequestBody @Valid CreateRequesterAbsenceDto dto) {
        RequesterAbsenceResponseDto created = absenceService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RequesterAbsenceResponseDto> update(
            @PathVariable Long id,
            @RequestBody @Valid CreateRequesterAbsenceDto dto
    ) {
        return ResponseEntity.ok(absenceService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        absenceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
