package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDetailDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDto;
import br.ufs.coffee_rep_gds_backend.services.RequesterService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/requester")
public class RequesterController {

    private final RequesterService requesterService;

    public RequesterController(RequesterService requesterService) {
        this.requesterService = requesterService;
    }

    @GetMapping
    public Page<RequesterResponseDto> getAllRequesters(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String cpf,
            Pageable pageable) {
        return requesterService.getAllRequesters(nome, cpf, pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequesterResponseDetailDto> getRequesterById(@PathVariable Long id) {
        RequesterResponseDetailDto requester = requesterService.getRequesterById(id);
        return ResponseEntity.ok(requester);
    }

    @GetMapping("/type/{requesterTypeId}")
    public Page<RequesterResponseDto> getRequestersByRequesterTypeId(
            @PathVariable Long requesterTypeId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String cpf,
            Pageable pageable) {
        return requesterService.getRequestersByRequesterTypeId(requesterTypeId, nome, cpf, pageable);
    }
}
