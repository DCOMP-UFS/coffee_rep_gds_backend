package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.services.ReservationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/reservation")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping()
    public Page<ReservationResponseDto> getAllReservations(
            @RequestParam(required = false) String nomeRequisitante,
            @RequestParam(required = false) String nomeSala,
            Pageable pageable) {
        return reservationService.findAll(nomeRequisitante, nomeSala, pageable);
    }

    @GetMapping("/date")
    public Page<ReservationResponseDto> getReservationsByStartAndEndDate(
            @RequestParam LocalDateTime inicio,
            @RequestParam LocalDateTime fim,
            @RequestParam(required = false) String nomeRequisitante,
            @RequestParam(required = false) String nomeSala,
            Pageable pageable) {
        return reservationService.findAllReservationsByStartAndEndDate(inicio, fim, nomeRequisitante, nomeSala, pageable);
    }
}
