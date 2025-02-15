package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import br.ufs.coffee_rep_gds_backend.enums.ReservationStatus;
import br.ufs.coffee_rep_gds_backend.exceptions.BadParametersException;
import br.ufs.coffee_rep_gds_backend.repositories.ReservationRepository;
import br.ufs.coffee_rep_gds_backend.specifications.ReservationSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;

    public ReservationService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    public Page<ReservationResponseDto> findAllReservationsByStartAndEndDate(
            LocalDateTime start,
            LocalDateTime end,
            String requesterName,
            String roomName,
            Pageable pageable
    ) {
        if (start.isAfter(end))
            throw new BadParametersException("A hora de início não pode ser maior que a hora fim da reserva.");

        Specification<Reservation> spec = ReservationSpecification.filter(requesterName, roomName);
        Page<Reservation> sourcePage = reservationRepository.findAllByStartEndDate(start, end, ReservationStatus.APPROVED.label, spec, pageable);

        List<ReservationResponseDto> list = sourcePage.stream().map(reservation -> new ReservationResponseDto(
                reservation.getStartDate(),
                reservation.getEndDate(),
                reservation.getRoom().getName(),
                reservation.getRequester().getName())).toList();

        return new PageImpl<>(list, pageable, sourcePage.getTotalElements());
    }

    public Page<ReservationResponseDto> findAll(
            String requesterName,
            String roomName,
            Pageable pageable) {

        Specification<Reservation> spec = ReservationSpecification.filter(requesterName, roomName);
        Page<Reservation> sourcePage = reservationRepository.findAll(spec, pageable);

        List<ReservationResponseDto> list = sourcePage.stream().map(reservation -> new ReservationResponseDto(
                reservation.getStartDate(),
                reservation.getEndDate(),
                reservation.getRoom().getName(),
                reservation.getRequester().getName())).toList();

        return new PageImpl<>(list, pageable, sourcePage.getTotalElements());
    }
}
