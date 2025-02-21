package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateReservationDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.ReservationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/reservation")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping
    public Page<ReservationResponseDto> getAllReservations(
            @RequestParam LocalDateTime inicio,
            @RequestParam LocalDateTime fim,
            @RequestParam(required = false) String nomeRequisitante,
            @RequestParam(required = false) String nomeSala,
            @RequestParam(required = false) Long salaId,
            @RequestParam(required = false) Long solicitanteId,
            Pageable pageable) {
        return reservationService.findAll(inicio, fim, nomeRequisitante, nomeSala, salaId, solicitanteId, pageable);
    }

    @PostMapping
    public ResponseEntity<CreateReservationResponseDto> createReservation(@RequestBody CreateReservationDto dto) {
        CreateReservationResponseDto createdDto = reservationService.createReservation(dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(createdDto);
    }
}
