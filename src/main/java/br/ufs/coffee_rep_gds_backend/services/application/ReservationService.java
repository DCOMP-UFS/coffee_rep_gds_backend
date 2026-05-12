package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateReservationDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.ReservationStatus;
import br.ufs.coffee_rep_gds_backend.exceptions.BadParametersException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterAbsenceRepository;
import br.ufs.coffee_rep_gds_backend.repositories.ReservationRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.RequesterDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.RoomDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.UserDomainService;
import br.ufs.coffee_rep_gds_backend.specifications.ReservationSpecification;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RequesterAbsenceRepository requesterAbsenceRepository;
    private final RoomDomainService roomService;
    private final RequesterDomainService requesterService;
    private final UserDomainService userService;

    public ReservationService(ReservationRepository reservationRepository, RequesterAbsenceRepository requesterAbsenceRepository, RoomDomainService roomService, RequesterDomainService requesterService, UserDomainService userService) {
        this.reservationRepository = reservationRepository;
        this.requesterAbsenceRepository = requesterAbsenceRepository;
        this.roomService = roomService;
        this.requesterService = requesterService;
        this.userService = userService;
    }

    public Page<ReservationResponseDto> findAll(
            LocalDateTime start,
            LocalDateTime end,
            String requesterName,
            String roomName,
            String sectionName,
            Long roomId,
            Long requesterId,
            Long sectionId,
            Pageable pageable
    ) {
        validateStartAndEndDate(start, end);

        Specification<Reservation> spec = ReservationSpecification.filter(requesterName, roomName, roomId, requesterId, sectionName, sectionId, start, end);
        Page<Reservation> sourcePage = reservationRepository.findAllByStartEndDate(ReservationStatus.APPROVED.label, spec, pageable);

        List<ReservationResponseDto> list = sourcePage.stream().map(this::toReservationResponseDto).toList();

        return new PageImpl<>(list, pageable, sourcePage.getTotalElements());
    }

    @Transactional
    public CreateReservationResponseDto createReservation(CreateReservationDto dto) {
        Room room = roomService.getRoomById(dto.salaId());
        Requester requester = requesterService.getRequesterById(dto.solicitanteId());
        User user = userService.findByID(CurrentUserUtils.getCurrentUserID());

        validateStartAndEndDate(dto.horaInicio(), dto.horaFim());
        validateReservationAlreadyExists(dto.horaInicio(), dto.horaFim(), dto.salaId());

        boolean isRecurrent;
        if (dto.fixo() == null) isRecurrent = false;
        else isRecurrent = dto.fixo();

        if (!isRecurrent) {
            Reservation reservation = new Reservation(dto.horaInicio(), dto.horaFim(), dto.observacoes(), null, room, requester, ReservationStatus.APPROVED.label, user);
            Reservation reservationCreated = reservationRepository.save(reservation);

            return new CreateReservationResponseDto(
                    reservationCreated.getId(),
                    reservationCreated.getStartDate(),
                    reservationCreated.getEndDate(),
                    reservationCreated.getRequester().getName(),
                    reservationCreated.getRoom().getName(),
                    null
            );
        }

        List<Reservation> recurrentReservations = createRecurrentReservations(dto, room, requester, user);

        if (recurrentReservations.isEmpty()) {
            throw new BadParametersException("Nenhuma reserva foi criada!");
        }

        reservationRepository.saveAll(recurrentReservations);

        Long recurrenceId = recurrentReservations.get(0).getRecurrenceId();

        return new CreateReservationResponseDto(null, null, null, requester.getName(), room.getName(), recurrenceId);
    }

    public List<ReservationResponseDto> findReservationsInCurrentMonth(Long sectionId, String sectionName) {
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime startOfMonth = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = currentMonth.atEndOfMonth().atTime(LocalTime.MAX);

        Specification<Reservation> spec = ReservationSpecification.filter(null, null, null, null, sectionName, sectionId, startOfMonth, endOfMonth);
        List<Reservation> allReservationsInCurrentMonth = reservationRepository.findAllReservationsInCurrentMonth(spec);

        return allReservationsInCurrentMonth.stream().map(this::toReservationResponseDto).toList();
    }

    @Transactional
    public void cancelReservation(Long reservationId) {
        Optional<Reservation> optionalReservation = reservationRepository.findByIdAndStatus(reservationId, ReservationStatus.APPROVED.label);

        if (optionalReservation.isEmpty()) throw new EntityNotFoundException("Nenhuma reserva ativa encontrada para este ID: " + reservationId);
        Reservation reservation = optionalReservation.get();
        reservation.setStatus(ReservationStatus.CANCELLED.label);

        reservationRepository.save(reservation);
    }

    @Transactional
    public void cancelRecurrentReservation(Long recurrenceId) {
        Optional<Long> foundRecurrences = reservationRepository.findOneRecurrenceId(recurrenceId, ReservationStatus.APPROVED.label);

        if (foundRecurrences.isEmpty()) throw new EntityNotFoundException("Nenhuma reserva ativa encontrada para este ID: " + recurrenceId);

        reservationRepository.updateStatusByRecurrenceId(recurrenceId, ReservationStatus.CANCELLED.label);
    }

    private List<Reservation> createRecurrentReservations(CreateReservationDto dto, Room room, Requester requester, User user) {
        Optional<Long> optionalLastId = reservationRepository.findLastRecurrenceId();

        Long newRecurrenceId = optionalLastId.map(aLong -> aLong + 1).orElse(1L);

        LocalDate startDate = dto.horaInicio().toLocalDate();
        LocalDate endDate = dto.horaFim().toLocalDate();

        LocalTime startTime = dto.horaInicio().toLocalTime();
        LocalTime endTime = dto.horaFim().toLocalTime();

        List<Integer> weekDays = new ArrayList<>(dto.dias());
        Collections.sort(weekDays);

        List<Reservation> reservations = new ArrayList<>();

        for (Integer weekDay: weekDays) {
            LocalDate firstOccur = startDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.of(weekDay)));

            while (!firstOccur.isAfter(endDate)) {
                LocalDateTime startDateTime = LocalDateTime.of(firstOccur, startTime);
                LocalDateTime endDateTime = LocalDateTime.of(firstOccur, endTime);

                Reservation reservation = new Reservation(startDateTime, endDateTime, dto.observacoes(), newRecurrenceId, room, requester, ReservationStatus.APPROVED.label, user);
                reservations.add(reservation);

                firstOccur = firstOccur.plusWeeks(1);
            }
        }

        reservations.sort(Comparator.comparing(Reservation::getStartDate));

        return reservations;
    }

    private void validateStartAndEndDate(LocalDateTime start, LocalDateTime end) {
        if (start != null && end != null) {
            if (start.isAfter(end)) throw new BadParametersException("A hora de início não pode ser maior que a hora fim da reserva.");
        }
    }

    private void validateReservationAlreadyExists(LocalDateTime start, LocalDateTime end, Long roomId) {
        Specification<Reservation> spec = ReservationSpecification.filter(null, null, roomId, null, null, null, start, end);
        List<Reservation> reservations = reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(ReservationStatus.APPROVED.label, spec);

        if (!reservations.isEmpty()) throw new EntityAlreadyExistsException("Já existe uma reserva para esta sala no horário solicitado!");
    }

    private boolean profissionalAusente(Reservation reservation) {
        if (reservation.getRequester() == null) {
            return false;
        }
        return requesterAbsenceRepository.existsForRequesterOnDate(
                reservation.getRequester().getId(),
                reservation.getStartDate().toLocalDate()
        );
    }

    private ReservationResponseDto toReservationResponseDto(Reservation reservation) {
        User updatedBy = reservation.getUpdatedBy();
        return new ReservationResponseDto(
                reservation.getId(),
                reservation.getStartDate(),
                reservation.getEndDate(),
                reservation.getRoom().getName(),
                reservation.getRequester().getName(),
                reservation.getRoom().getSection().getName(),
                updatedBy == null ? null : updatedBy.getName(),
                reservation.getRoom().getId(),
                reservation.getRequester().getId(),
                reservation.getRoom().getSection().getId(),
                reservation.getRecurrenceId(),
                profissionalAusente(reservation)
        );
    }

}
