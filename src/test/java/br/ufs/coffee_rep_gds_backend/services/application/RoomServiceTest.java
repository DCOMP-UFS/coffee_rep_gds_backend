package br.ufs.coffee_rep_gds_backend.services.application;


import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRoomDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRoomResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.projections.RoomProjection;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.RoomDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.SectionDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.UserDomainService;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock private RoomDomainService roomDomainService;
    @Mock private SectionDomainService sectionDomainService;
    @Mock private UserDomainService userDomainService;

    @InjectMocks
    private RoomService roomService;

    @Test
    void shouldReturnRoomWhenExists() {
        RoomProjection projection = mock(RoomProjection.class);
        when(projection.getId()).thenReturn(1L);
        when(projection.getName()).thenReturn("Sala A");
        when(projection.getSection()).thenReturn("Setor 1");
        when(projection.getSectionId()).thenReturn(10L);
        when(projection.getOcupationStatus()).thenReturn(true);

        when(roomRepository.findActive(1L, Status.ACTIVE.value)).thenReturn(Optional.of(projection));

        RoomResponseDto dto = roomService.getRoomById(1L);

        assertEquals("Sala A", dto.nome());
        assertEquals("Setor 1", dto.setor());
    }

    @Test
    void shouldReturnRoomsBySectionId() {
        RoomProjection projection = mock(RoomProjection.class);
        when(projection.getId()).thenReturn(1L);
        when(projection.getName()).thenReturn("Sala A");
        when(projection.getSection()).thenReturn("Setor 1");
        when(projection.getSectionId()).thenReturn(10L);
        when(projection.getOcupationStatus()).thenReturn(true);

        Page<RoomProjection> page = new PageImpl<>(new ArrayList<RoomProjection>() {{
            add(projection);
        }});

        Pageable pageable = Pageable.unpaged();

        when(roomRepository.findBySectionId(10L, Status.ACTIVE.value, "Setor 1", true, pageable)).thenReturn(page);

        Page<RoomResponseDto> response = roomService.getRoomsBySectionId(10L, "Setor 1", true, pageable);

        Assertions.assertEquals(1, response.getTotalElements());
    }

    @Test
    void shouldReturnAllActiveRooms() {
        RoomProjection projection = mock(RoomProjection.class);
        when(projection.getId()).thenReturn(1L);
        when(projection.getName()).thenReturn("Sala A");
        when(projection.getSection()).thenReturn("Setor 1");
        when(projection.getSectionId()).thenReturn(10L);
        when(projection.getOcupationStatus()).thenReturn(true);

        Page<RoomProjection> page = new PageImpl<>(new ArrayList<RoomProjection>() {{
            add(projection);
        }});

        Pageable pageable = Pageable.unpaged();

        when(roomRepository.findRoomWithOccupation(Status.ACTIVE.value, "Sala 1", "Setor 1", true, pageable)).thenReturn(page);

        Page<RoomResponseDto> response = roomService.getAllActiveRooms("Sala 1","Setor 1", true, pageable);

        Assertions.assertEquals(1, response.getTotalElements());
    }

    @Test
    void shouldReturnAllActiveRoomsWhenUnpaged() {
        RoomProjection projection = mock(RoomProjection.class);
        when(projection.getId()).thenReturn(1L);
        when(projection.getName()).thenReturn("Sala A");
        when(projection.getSection()).thenReturn("Setor 1");
        when(projection.getSectionId()).thenReturn(10L);
        when(projection.getOcupationStatus()).thenReturn(true);

        List<RoomProjection> rooms = new ArrayList<>() {{
            add(projection);
        }};

        Pageable pageable = Pageable.unpaged();

        when(roomRepository.findAllActiveRoomUnpaged(Status.ACTIVE.value, "Sala 1", "Setor 1", true)).thenReturn(rooms);

        List<RoomResponseDto> response = roomService.getAllActiveRoomsUnpaged("Sala 1","Setor 1", true);

        Assertions.assertEquals(1, response.size());
    }

    @Test
    void shouldReturnAllActiveRoomsBySectionWhenUnpaged() {
        RoomProjection projection = mock(RoomProjection.class);
        when(projection.getId()).thenReturn(1L);
        when(projection.getName()).thenReturn("Sala A");
        when(projection.getSection()).thenReturn("Setor 1");
        when(projection.getSectionId()).thenReturn(10L);
        when(projection.getOcupationStatus()).thenReturn(true);

        List<RoomProjection> rooms = new ArrayList<>(){{add(projection);}};

        when(roomRepository.findBySectionIdUnpaged(10L, Status.ACTIVE.value, "Sala 1",  true)).thenReturn(rooms);

        List<RoomResponseDto> response = roomService.getRoomsBySectionIdUnpaged(10L, "Sala 1", true);

        Assertions.assertEquals(1, response.size());
    }

    @Test
    void shouldThrowExceptionWhenRoomNotFound() {
        when(roomRepository.findActive(1L, Status.ACTIVE.value)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> roomService.getRoomById(1L));
    }

    @Test
    void shouldCreateRoomWhenNotExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateRoomDTO dto = new CreateRoomDTO("Sala Nova", 1L);
            Section section = new Section(); section.setId(1L); section.setName("Setor A");
            User user = new User(); user.setUserId(1L);

            when(sectionDomainService.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(section);
            when(userDomainService.findByID(any())).thenReturn(user);
            when(roomDomainService.getRoomByNameAndSection("Sala Nova", section)).thenReturn(Optional.empty());

            Room savedRoom = new Room("Sala Nova", Status.ACTIVE.value, user, section);
            savedRoom.setId(100L);
            when(roomRepository.save(any())).thenReturn(savedRoom);

            CreateRoomResponseDTO response = roomService.create(dto);

            assertEquals(100L, response.id());
            assertEquals("Sala Nova", response.nome());
            assertEquals("Setor A", response.setor());
        }
    }

    @Test
    void shouldEnableRoomWhenInactive() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateRoomDTO dto = new CreateRoomDTO("Sala Nova", 1L);
            Section section = new Section(); section.setId(1L); section.setName("Setor A");
            User user = new User(); user.setUserId(1L);
            Room room = new Room("Sala Nova", Status.INACTIVE.value, user, section);

            when(sectionDomainService.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(section);
            when(userDomainService.findByID(any())).thenReturn(user);
            when(roomDomainService.getRoomByNameAndSection("Sala Nova", section)).thenReturn(Optional.of(room));

            Room savedRoom = new Room("Sala Nova", Status.ACTIVE.value, user, section);
            savedRoom.setId(100L);
            when(roomRepository.save(any())).thenReturn(savedRoom);

            CreateRoomResponseDTO response = roomService.create(dto);

            assertEquals(100L, response.id());
            assertEquals("Sala Nova", response.nome());
            assertEquals("Setor A", response.setor());
        }
    }

    @Test
    void shouldThrowExceptionWhenRoomAlreadyExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateRoomDTO dto = new CreateRoomDTO("Sala Existente", 1L);
            Section section = new Section(); section.setId(1L);
            Room existingRoom = new Room();
            existingRoom.setStatus(Status.ACTIVE.value);

            when(sectionDomainService.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(section);
            when(userDomainService.findByID(any())).thenReturn(new User());
            when(roomDomainService.getRoomByNameAndSection("Sala Existente", section)).thenReturn(Optional.of(existingRoom));

            assertThrows(EntityAlreadyExistsException.class, () -> roomService.create(dto));
        }
    }

    @Test
    void shouldUpdateRoomWhenExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateRoomDTO dto = new CreateRoomDTO("Sala Atualizada", 2L);
            Section section = new Section(); section.setId(2L); section.setName("Setor Novo");
            User user = new User(); user.setUserId(1L);

            Room room = new Room(); room.setId(1L);
            room.setName("Antigo"); room.setSection(new Section("Setor Antigo", "Observações", 1, user));

            when(roomRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.of(room));
            when(userDomainService.findByID(any())).thenReturn(user);
            when(sectionDomainService.findByIdAndStatus(2L, Status.ACTIVE.value)).thenReturn(section);
            when(roomRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

            CreateRoomResponseDTO response = roomService.update(1L, dto);

            assertEquals("Sala Atualizada", response.nome());
            assertEquals("Setor Novo", response.setor());
        }
    }

    @Test
    void shouldThrowExceptionWhileUpdateWhenRoomNotFound() {
        when(roomRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> roomService.update(1L, new CreateRoomDTO("Sala", 1L)));
    }

    @Test
    void shouldInactivateRoomWhenExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);
            Room room = new Room(); room.setId(1L); room.setStatus(Status.ACTIVE.value);
            User user = new User(); user.setUserId(1L);

            when(roomRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.of(room));
            when(userDomainService.findByID(any())).thenReturn(user);

            roomService.delete(1L);

            assertEquals(Status.INACTIVE.value, room.getStatus());
            verify(roomRepository).save(room);
        }
    }

    @Test
    void shouldThrowExceptionWhileDeleteWhenRoomNotFound() {
        when(roomRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> roomService.delete(1L));
    }
}
