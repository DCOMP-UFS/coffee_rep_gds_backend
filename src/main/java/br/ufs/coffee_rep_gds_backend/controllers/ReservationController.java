package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateReservationDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.ReservationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reservation")
@Tag(name = "ReservationController", description = "Controller para Reservas")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping
    public Page<ReservationResponseDto> getAllReservations(
            @RequestParam LocalDateTime inicio,
            @RequestParam LocalDateTime fim,
            @RequestParam(required = false) String solicitante,
            @RequestParam(required = false) String sala,
            @RequestParam(required = false)String setor,
            @RequestParam(required = false) Long salaId,
            @RequestParam(required = false) Long solicitanteId,
            @RequestParam(required = false)Long setorId,
            Pageable pageable) {
        return reservationService.findAll(inicio, fim, solicitante, sala, setor, salaId, solicitanteId, setorId, pageable);
    }

    @PostMapping
    public ResponseEntity<CreateReservationResponseDto> createReservation(@RequestBody @Valid CreateReservationDto dto) {
        CreateReservationResponseDto createdDto = reservationService.createReservation(dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(createdDto);
    }

    @GetMapping("/current-month")
    public ResponseEntity<List<ReservationResponseDto>> getAllReservationsInCurrentMonth(
            @RequestParam(required = false)String setor,
            @RequestParam(required = false)Long setorId
    ) {
        List<ReservationResponseDto> reservationsInCurrentMonth = reservationService.findReservationsInCurrentMonth(setorId, setor);
        return ResponseEntity.ok(reservationsInCurrentMonth);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Void> cancelReservation(@PathVariable Long id) {
        reservationService.cancelReservation(id);
        return ResponseEntity.noContent().build();
    }
}
