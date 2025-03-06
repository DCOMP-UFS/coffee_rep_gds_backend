package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.request.UpdateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRequesterResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDetailDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.RequesterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requester")
public class RequesterController {

    private final RequesterService requesterService;

    public RequesterController(RequesterService requesterService) {
        this.requesterService = requesterService;
    }

    @GetMapping
    public ResponseEntity<?> getAllRequesters(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String cpf,
            @RequestParam(required = false) Boolean unpaged,
            Pageable pageable) {

        if (unpaged != null && unpaged) {
            List<RequesterResponseDto> requesters = requesterService.getAllRequesters(nome, cpf);
            return ResponseEntity.ok(requesters);
        }
        Page<RequesterResponseDto> requesters = requesterService.getAllRequesters(nome, cpf, pageable);
        return ResponseEntity.ok(requesters);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequesterResponseDetailDto> getRequesterById(@PathVariable Long id) {
        RequesterResponseDetailDto dto = requesterService.getRequesterById(id);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/type/{requesterTypeId}")
    public Page<RequesterResponseDto> getRequestersByRequesterTypeId(
            @PathVariable Long requesterTypeId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String cpf,
            Pageable pageable) {
        return requesterService.getRequestersByRequesterTypeId(requesterTypeId, nome, cpf, pageable);
    }

    @PostMapping
    public ResponseEntity<CreateRequesterResponseDTO> create(@Valid @RequestBody CreateRequesterDTO dto) {
        CreateRequesterResponseDTO createRequesterResponseDTO = requesterService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createRequesterResponseDTO);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CreateRequesterResponseDTO> update(@PathVariable Long id, @Valid @RequestBody UpdateRequesterDTO dto){
        CreateRequesterResponseDTO update = requesterService.update(id, dto);
        return ResponseEntity.ok(update);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        requesterService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
