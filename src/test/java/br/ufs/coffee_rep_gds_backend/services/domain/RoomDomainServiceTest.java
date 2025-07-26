package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class RoomDomainServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private RoomDomainService roomDomainService;

    @Test
    void shouldReturnRoomWhenExistsAndActive() {
        Room room = new Room();
        room.setId(1L);
        room.setStatus(Status.ACTIVE.value);

        when(roomRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.of(room));

        Room result = roomDomainService.getRoomById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
    }

    @Test
    void shouldThrowExceptionWhenRoomNotFound() {
        when(roomRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.empty());

        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> {
            roomDomainService.getRoomById(1L);
        });

        assertEquals("Sala não encontrada!", exception.getMessage());
    }

    @Test
    void shouldReturnOptionalRoomByNameAndSection() {
        Section section = new Section();
        section.setId(1L);

        Room room = new Room();
        room.setName("Sala A");

        when(roomRepository.getRoomByNameIgnoreCaseAndSection("Sala A", section)).thenReturn(Optional.of(room));

        Optional<Room> result = roomDomainService.getRoomByNameAndSection("Sala A", section);

        assertTrue(result.isPresent());
        assertEquals("Sala A", result.get().getName());
    }

    @Test
    void shouldReturnEmptyWhenNotFoundByNameAndSection() {
        Section section = new Section();
        section.setId(1L);

        when(roomRepository.getRoomByNameIgnoreCaseAndSection("Inexistente", section)).thenReturn(Optional.empty());

        Optional<Room> result = roomDomainService.getRoomByNameAndSection("Inexistente", section);

        assertTrue(result.isEmpty());
    }
}
