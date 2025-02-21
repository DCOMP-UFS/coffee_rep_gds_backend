package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateReservationDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.enums.ReservationStatus;
import br.ufs.coffee_rep_gds_backend.exceptions.BadParametersException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
import br.ufs.coffee_rep_gds_backend.repositories.ReservationRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.RequesterDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.RoomDomainService;
import br.ufs.coffee_rep_gds_backend.specifications.ReservationSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RoomDomainService roomService;
    private final RequesterDomainService requesterService;

    public ReservationService(ReservationRepository reservationRepository, RoomDomainService roomService, RequesterDomainService requesterService) {
        this.reservationRepository = reservationRepository;
        this.roomService = roomService;
        this.requesterService = requesterService;
    }

    public Page<ReservationResponseDto> findAll(
            LocalDateTime start,
            LocalDateTime end,
            String requesterName,
            String roomName,
            Long roomId,
            Long requesterId,
            Pageable pageable
    ) {
        validateStartAndEndDate(start, end);

        Specification<Reservation> spec = ReservationSpecification.filter(requesterName, roomName, roomId, requesterId, start, end);
        Page<Reservation> sourcePage = reservationRepository.findAllByStartEndDate(ReservationStatus.APPROVED.label, spec, pageable);

        List<ReservationResponseDto> list = sourcePage.stream().map(reservation -> new ReservationResponseDto(
                reservation.getStartDate(),
                reservation.getEndDate(),
                reservation.getRoom().getName(),
                reservation.getRequester().getName(),
                reservation.getRoom().getId(),
                reservation.getRequester().getId())).toList();

        return new PageImpl<>(list, pageable, sourcePage.getTotalElements());
    }

    @Transactional
    public CreateReservationResponseDto createReservation(CreateReservationDto dto) {
        Room room = roomService.getRoomById(dto.salaId());
        Requester requester = requesterService.getRequesterById(dto.solicitanteId());

        validateStartAndEndDate(dto.horaInicio(), dto.horaFim());
        validateReservationAlreadyExists(dto.horaInicio(), dto.horaFim(), dto.salaId());

        Reservation reservation = new Reservation(dto.horaInicio(), dto.horaFim(), dto.observacoes(), room, requester, ReservationStatus.APPROVED.label);
        Reservation reservationCreated = reservationRepository.save(reservation);

        return new CreateReservationResponseDto(
                reservationCreated.getId(),
                reservationCreated.getStartDate(),
                reservationCreated.getEndDate(),
                reservationCreated.getRequester().getName(),
                reservationCreated.getRoom().getName()
        );
    }

    private void validateStartAndEndDate(LocalDateTime start, LocalDateTime end) {
        if (start != null && end != null) {
            if (start.isAfter(end)) throw new BadParametersException("A hora de início não pode ser maior que a hora fim da reserva.");
        }
    }

    private void validateReservationAlreadyExists(LocalDateTime start, LocalDateTime end, Long roomId) {
        List<Reservation> reservations = reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(start, end, roomId);

        if (!reservations.isEmpty()) throw new EntityAlreadyExistsException("Já existe uma reserva para este quarto no horário solicitado!");
    }

}
