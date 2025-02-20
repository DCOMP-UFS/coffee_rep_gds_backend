package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateReservationDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import br.ufs.coffee_rep_gds_backend.services.ReservationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

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
        Page<Reservation> sourcePage = reservationService.findAll(inicio, fim, nomeRequisitante, nomeSala, salaId, solicitanteId, pageable);

        List<ReservationResponseDto> list = sourcePage.stream().map(reservation -> new ReservationResponseDto(
                reservation.getStartDate(),
                reservation.getEndDate(),
                reservation.getRoom().getName(),
                reservation.getRequester().getName(),
                reservation.getRoom().getId(),
                reservation.getRequester().getId())).toList();

        return new PageImpl<>(list, pageable, sourcePage.getTotalElements());
    }

    @PostMapping
    public ResponseEntity<CreateReservationResponseDto> createReservation(@RequestBody CreateReservationDto dto) {
        Reservation reservationCreated = reservationService.createReservation(dto);

        CreateReservationResponseDto createdDto = new CreateReservationResponseDto(reservationCreated.getId(), reservationCreated.getStartDate(), reservationCreated.getEndDate(), reservationCreated.getRequester().getName(), reservationCreated.getRoom().getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(createdDto);
    }
}
