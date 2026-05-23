package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateReservationDto;
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
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;


@ExtendWith(MockitoExtension.class)
class ReservationServiceTest
{

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private RequesterAbsenceRepository requesterAbsenceRepository;
    @Mock private RoomDomainService roomService;
    @Mock private RequesterDomainService requesterService;
    @Mock private UserDomainService userService;

    @InjectMocks
    private ReservationService reservationService;

    @Test
    void shouldReturnPageOfReservationResponseDtoWhenValidParameters() {
        LocalDateTime start = LocalDateTime.of(2025, 7, 1, 10, 0);
        LocalDateTime end = LocalDateTime.of(2025, 7, 31, 18, 0);
        Pageable pageable = PageRequest.of(0, 10);

        Room room = new Room();
        room.setId(1L);
        room.setName("Sala 1");

        var section = new br.ufs.coffee_rep_gds_backend.entities.Section();
        section.setId(1L);
        section.setName("Seção A");
        room.setSection(section);

        Requester requester = new Requester();
        requester.setId(2L);
        requester.setName("Fulano");

        User updatedBy = new User();
        updatedBy.setName("Admin");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStartDate(start);
        reservation.setEndDate(end);
        reservation.setRoom(room);
        reservation.setRequester(requester);
        reservation.setUpdatedBy(updatedBy);
        reservation.setRecurrenceId(1L);

        Page<Reservation> reservationPage = new PageImpl<>(List.of(reservation));

        when(reservationRepository.findAllByStartEndDate(
                eq(ReservationStatus.APPROVED.label),
                any(Specification.class),
                eq(pageable)
        )).thenReturn(reservationPage);

        when(requesterAbsenceRepository.existsForRequesterOnDate(any(), any())).thenReturn(false);

        Page<ReservationResponseDto> result = reservationService.findAll(
                start, end, null, null, null, null, null, null, pageable
        );

        assertEquals(1, result.getTotalElements());
        ReservationResponseDto dto = result.getContent().get(0);
        assertEquals("Sala 1", dto.sala());
        assertEquals("Fulano", dto.solicitante());
        assertEquals("Seção A", dto.setor());
    }

    @Test
    void shouldReturnReservationWhenUpdatedByIsNull() {
        LocalDateTime start = LocalDateTime.of(2025, 7, 1, 10, 0);
        LocalDateTime end = LocalDateTime.of(2025, 7, 31, 18, 0);
        Pageable pageable = PageRequest.of(0, 10);

        Room room = new Room();
        room.setId(1L);
        room.setName("Sala 1");

        var section = new br.ufs.coffee_rep_gds_backend.entities.Section();
        section.setId(1L);
        section.setName("Seção A");
        room.setSection(section);

        Requester requester = new Requester();
        requester.setId(2L);
        requester.setName("Fulano");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStartDate(start);
        reservation.setEndDate(end);
        reservation.setRoom(room);
        reservation.setRequester(requester);

        when(reservationRepository.findAllByStartEndDate(
                eq(ReservationStatus.APPROVED.label),
                any(Specification.class),
                eq(pageable)
        )).thenReturn(new PageImpl<>(List.of(reservation)));

        when(requesterAbsenceRepository.existsForRequesterOnDate(any(), any())).thenReturn(false);

        Page<ReservationResponseDto> result = reservationService.findAll(
                start, end, null, null, null, null, null, null, pageable
        );

        assertEquals(1, result.getTotalElements());
        assertNull(result.getContent().get(0).criador());
    }

    @Test
    void shouldThrowExceptionWhenStartDateIsAfterEndDate() {
        LocalDateTime start = LocalDateTime.of(2025, 8, 1, 10, 0);
        LocalDateTime end = LocalDateTime.of(2025, 7, 1, 10, 0);
        Pageable pageable = PageRequest.of(0, 10);

        assertThrows(BadParametersException.class, () -> reservationService.findAll(
                start, end, null, null, null, null, null, null, pageable
        ));
    }


    @Test
    void shouldCreateSingleReservationWhenNotRecurrent() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            var dto = new CreateReservationDto(
                    1L,
                    2L,
                    LocalDateTime.of(2025, 7, 25, 10, 0),
                    LocalDateTime.of(2025, 7, 25, 11, 0),
                    "Observação",
                    false,
                    Set.of()
            );

            Room room = new Room(); room.setId(1L); room.setName("Sala A");
            Requester requester = new Requester(); requester.setId(2L); requester.setName("Fulano");
            User user = new User(); user.setUserId(3L); user.setName("Admin");

            Reservation savedReservation = new Reservation(dto.horaInicio(), dto.horaFim(), dto.observacoes(), null, room, requester, ReservationStatus.APPROVED.label, user);
            savedReservation.setId(100L);

            when(roomService.getRoomById(1L)).thenReturn(room);
            when(requesterService.getRequesterById(2L)).thenReturn(requester);
            when(userService.findByID(any())).thenReturn(user);
            when(reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(any(), any())).thenReturn(List.of());
            when(reservationRepository.save(any())).thenReturn(savedReservation);

            var response = reservationService.createReservation(dto);

            assertEquals(100L, response.id());
            assertEquals("Sala A", response.roomName());
            assertEquals("Fulano", response.requesterName());
        }

    }

    @Test
    void shouldCreateRecurrentReservationWhenValidParameters() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            var dto = new CreateReservationDto(
                    1L,
                    2L,
                    LocalDateTime.of(2025, 7, 25, 10, 0),
                    LocalDateTime.of(2025, 8, 10, 11, 0),
                    "Observação",
                    true,
                    Set.of(1,2,3)
            );

            Room room = new Room(); room.setId(1L); room.setName("Sala A");
            Requester requester = new Requester(); requester.setId(2L); requester.setName("Fulano");
            User user = new User(); user.setUserId(3L); user.setName("Admin");

            LocalDateTime startTime1 = LocalDateTime.of(2025, 7, 25, 10, 0);
            LocalDateTime endTime1 = LocalDateTime.of(2025, 7, 25, 10, 0);
            Reservation reservation1 = new Reservation(startTime1, endTime1, dto.observacoes(), null, room, requester, ReservationStatus.APPROVED.label, user);
            reservation1.setId(100L);

            LocalDateTime startTime2 = LocalDateTime.of(2025, 7, 25, 10, 0);
            LocalDateTime endTime2 = LocalDateTime.of(2025, 7, 25, 10, 0);
            Reservation reservation2 = new Reservation(startTime2, endTime2, dto.observacoes(), null, room, requester, ReservationStatus.APPROVED.label, user);
            reservation1.setId(101L);

            LocalDateTime startTime3 = LocalDateTime.of(2025, 7, 25, 10, 0);
            LocalDateTime endTime3 = LocalDateTime.of(2025, 7, 25, 10, 0);
            Reservation reservation3 = new Reservation(startTime3, endTime3, dto.observacoes(), null, room, requester, ReservationStatus.APPROVED.label, user);
            reservation1.setId(101L);

            List<Reservation> reservations = List.of(reservation1, reservation2, reservation3);

            when(roomService.getRoomById(1L)).thenReturn(room);
            when(requesterService.getRequesterById(2L)).thenReturn(requester);
            when(userService.findByID(any())).thenReturn(user);

            when(reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(any(), any())).thenReturn(List.of());

            when(reservationRepository.findLastRecurrenceId()).thenReturn(Optional.of(1L));
            when(reservationRepository.saveAll(any())).thenReturn(reservations);

            var response = reservationService.createReservation(dto);

            assertEquals(2L, response.recurrenceId());
        }

    }

    @Test
    void shouldThrowExceptionWhileCreateRecurrentReservationWhenInvalidParameters() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            var dto = new CreateReservationDto(
                    1L,
                    2L,
                    LocalDateTime.of(2025, 7, 25, 10, 0),
                    LocalDateTime.of(2025, 7, 25, 10, 0),
                    "Observação",
                    true,
                    Set.of(1)
            );

            Room room = new Room(); room.setId(1L); room.setName("Sala A");
            Requester requester = new Requester(); requester.setId(2L); requester.setName("Fulano");
            User user = new User(); user.setUserId(3L); user.setName("Admin");

            when(roomService.getRoomById(1L)).thenReturn(room);
            when(requesterService.getRequesterById(2L)).thenReturn(requester);
            when(userService.findByID(any())).thenReturn(user);

            assertThrows(BadParametersException.class, () -> reservationService.createReservation(dto));
        }

    }

    @Test
    void shouldCheckOverlapForEachRecurrentOccurrence() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            var dto = new CreateReservationDto(
                    1L,
                    2L,
                    LocalDateTime.of(2030, 5, 27, 14, 0),
                    LocalDateTime.of(2030, 5, 30, 18, 0),
                    "Observação",
                    true,
                    Set.of(1, 2, 3, 4)
            );

            Room room = new Room();
            room.setId(1L);
            room.setName("Sala A");
            Requester requester = new Requester();
            requester.setId(2L);
            requester.setName("Fulano");
            User user = new User();
            user.setUserId(3L);

            when(roomService.getRoomById(1L)).thenReturn(room);
            when(requesterService.getRequesterById(2L)).thenReturn(requester);
            when(userService.findByID(any())).thenReturn(user);
            when(reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(any(), any())).thenReturn(List.of());
            when(reservationRepository.findLastRecurrenceId()).thenReturn(Optional.of(1L));
            when(reservationRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

            reservationService.createReservation(dto);

            verify(reservationRepository, times(4)).findAllByStartDateAndEndDateAndRoom_Id(any(), any());
        }
    }

    @Test
    void shouldThrowWhenRecurrentReservationOverlapsExistingSlot() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            var dto = new CreateReservationDto(
                    1L,
                    2L,
                    LocalDateTime.of(2030, 5, 27, 14, 0),
                    LocalDateTime.of(2030, 5, 27, 18, 0),
                    "Observação",
                    true,
                    Set.of(1)
            );

            when(roomService.getRoomById(1L)).thenReturn(new Room());
            when(requesterService.getRequesterById(2L)).thenReturn(new Requester());
            when(userService.findByID(any())).thenReturn(new User());
            when(reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(any(), any()))
                    .thenReturn(List.of(new Reservation()));

            assertThrows(EntityAlreadyExistsException.class, () -> reservationService.createReservation(dto));
            verify(reservationRepository, never()).saveAll(any());
        }
    }

    @Test
    void shouldThrowExceptionWhenReservationAlreadyExists() {

        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);


            var dto = new CreateReservationDto(
                    1L,
                    2L,
                    LocalDateTime.of(2025, 7, 25, 10, 0),
                    LocalDateTime.of(2025, 7, 25, 11, 0),
                    "Observação",
                    false,
                    Set.of()
            );

            when(roomService.getRoomById(1L)).thenReturn(new Room());
            when(requesterService.getRequesterById(2L)).thenReturn(new Requester());
            when(userService.findByID(any())).thenReturn(new User());
            when(reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(any(), any()))
                    .thenReturn(List.of(new Reservation()));

            assertThrows(EntityAlreadyExistsException.class, () -> reservationService.createReservation(dto));

        }
    }

    @Test
    void shouldReturnListWhenReservationsExistInCurrentMonth() {
        Room room = new Room(); room.setId(1L); room.setName("Sala A");
        var section = new br.ufs.coffee_rep_gds_backend.entities.Section(); section.setId(1L); section.setName("Seção A");
        room.setSection(section);

        Requester requester = new Requester(); requester.setId(2L); requester.setName("Fulano");
        User user = new User(); user.setName("Admin");

        Reservation reservation = new Reservation();
        reservation.setId(10L);
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusHours(1));
        reservation.setRoom(room);
        reservation.setRequester(requester);
        reservation.setUpdatedBy(user);
        reservation.setRecurrenceId(1L);

        when(reservationRepository.findAllReservationsInCurrentMonth(any())).thenReturn(List.of(reservation));

        var result = reservationService.findReservationsInCurrentMonth(1L, "Seção A");

        assertEquals(1, result.size());
        assertEquals("Sala A", result.get(0).sala());
    }

    @Test
    void shouldCancelReservationWhenReservationExists() {
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setStatus(ReservationStatus.APPROVED.label);

        when(reservationRepository.findByIdAndStatus(1L, ReservationStatus.APPROVED.label))
                .thenReturn(Optional.of(reservation));

        reservationService.cancelReservation(1L);

        assertEquals(ReservationStatus.CANCELLED.label, reservation.getStatus());
        verify(reservationRepository).save(reservation);
    }

    @Test
    void shouldThrowExceptionWhileCancelReservationWhenReservationNotFound() {
        when(reservationRepository.findByIdAndStatus(1L, ReservationStatus.APPROVED.label))
                .thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> reservationService.cancelReservation(1L));
    }

    @Test
    void shouldCancelRecurrentReservationsWhenRecurrenceExists() {
        when(reservationRepository.findOneRecurrenceId(99L, ReservationStatus.APPROVED.label))
                .thenReturn(Optional.of(99L));

        reservationService.cancelRecurrentReservation(99L);

        verify(reservationRepository).updateStatusByRecurrenceId(99L, ReservationStatus.CANCELLED.label);
    }

    @Test
    void shouldThrowExceptionWhileCancelRecurrentReservationsWhenReservationsNotFound() {
        when(reservationRepository.findOneRecurrenceId(99L, ReservationStatus.APPROVED.label))
                .thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> reservationService.cancelRecurrentReservation(99L));
    }

}
