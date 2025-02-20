package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDetailDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.services.RequesterService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
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
    public Page<RequesterResponseDto> getAllRequesters(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String cpf,
            Pageable pageable) {
        Page<Requester> requesterPage = requesterService.getAllRequesters(nome, cpf, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getName(),
                req.getRequesterType().getName(),
                req.getRequesterType().getPosition())).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequesterResponseDetailDto> getRequesterById(@PathVariable Long id) {
        Requester requester = requesterService.getRequesterById(id);
        var dto = new RequesterResponseDetailDto(
                requester.getName(),
                requester.getCpf(),
                requester.getContact_number(),
                requester.getRequesterType().getName(),
                requester.getRequesterType().getPosition());

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/type/{requesterTypeId}")
    public Page<RequesterResponseDto> getRequestersByRequesterTypeId(
            @PathVariable Long requesterTypeId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String cpf,
            Pageable pageable) {
        Page<Requester> requesterPage = requesterService.getRequestersByRequesterTypeId(requesterTypeId, nome, cpf, pageable);

        List<RequesterResponseDto> list = requesterPage.stream().map(req -> new RequesterResponseDto(
                req.getName(),
                req.getRequesterType().getName(),
                req.getRequesterType().getPosition())).toList();
        return new PageImpl<>(list, pageable, requesterPage.getTotalElements());
    }
}
