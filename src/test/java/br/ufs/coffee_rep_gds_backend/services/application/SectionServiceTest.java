package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateSectionDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateSectionResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.SectionDomainService;
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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;


@ExtendWith(MockitoExtension.class)
class SectionServiceTest {

    @Mock
    private SectionRepository sectionRepository;
    @Mock private SectionDomainService sectionDomainService;
    @Mock private UserDomainService userDomainService;

    @InjectMocks
    private SectionService sectionService;

    @Test
    void shouldReturnPageOfActiveSections() {
        Section section = new Section("TI", "Observações", Status.ACTIVE.value, new User());
        section.setId(1L);
        Page<Section> page = new PageImpl<>(List.of(section));
        Pageable pageable = PageRequest.of(0, 10);

        when(sectionRepository.findAllByStatus(eq(Status.ACTIVE.value), any(), eq(pageable))).thenReturn(page);

        Page<SectionResponseDto> result = sectionService.findAllActive("TI", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("TI", result.getContent().get(0).nome());
    }

    @Test
    void shouldReturnListOfActiveSections() {
        Section section = new Section("RH", "Observações", Status.ACTIVE.value, new User());
        section.setId(2L);

        when(sectionRepository.findAllByStatusUnpaged(eq(Status.ACTIVE.value), any())).thenReturn(List.of(section));

        List<SectionResponseDto> result = sectionService.findAllActive("RH");

        assertEquals(1, result.size());
        assertEquals("RH", result.get(0).nome());
    }

    @Test
    void shouldCreateNewSectionWhenNotExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateSectionDTO dto = new CreateSectionDTO("Financeiro", "Observações");
            User user = new User(); user.setUserId(1L);

            when(sectionDomainService.findByName("Financeiro")).thenReturn(Optional.empty());
            when(userDomainService.findByID(any())).thenReturn(user);
            when(sectionRepository.save(any())).thenAnswer(invocation -> {
                Section s = invocation.getArgument(0);
                s.setId(10L);
                return s;
            });

            CreateSectionResponseDTO response = sectionService.create(dto);

            assertEquals("Financeiro", response.nome());
            assertEquals("Observações", response.observacao());
        }

    }

    @Test
    void shouldReactivateSectionWhenInactiveExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateSectionDTO dto = new CreateSectionDTO("Jurídico", "Nova observação");
            User user = new User(); user.setUserId(1L);
            Section section = new Section("Jurídico", "Antiga", Status.INACTIVE.value, user);
            section.setId(5L);

            when(sectionDomainService.findByName("Jurídico")).thenReturn(Optional.of(section));
            when(userDomainService.findByID(any())).thenReturn(user);
            when(sectionRepository.save(any())).thenReturn(section);

            CreateSectionResponseDTO response = sectionService.create(dto);

            assertEquals("Jurídico", response.nome());
        }

    }

    @Test
    void shouldThrowExceptionWhenActiveSectionExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateSectionDTO dto = new CreateSectionDTO("TI", "Observações");
            Section section = new Section("TI", "Obs", Status.ACTIVE.value, new User());

            when(sectionDomainService.findByName("TI")).thenReturn(Optional.of(section));

            assertThrows(EntityAlreadyExistsException.class, () -> sectionService.create(dto));
        }
    }

    @Test
    void shouldUpdateSectionWhenValid() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);
            CreateSectionDTO dto = new CreateSectionDTO("Atualizado", "Nova observação");
            User user = new User(); user.setUserId(1L);
            Section section = new Section("Antigo", "Obs", Status.ACTIVE.value, user);
            section.setId(1L);

            when(sectionRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.of(section));
            when(userDomainService.findByID(any())).thenReturn(user);
            when(sectionDomainService.findByName("Atualizado")).thenReturn(Optional.empty());
            when(sectionRepository.save(any())).thenReturn(section);

            CreateSectionResponseDTO response = sectionService.update(1L, dto);

            assertEquals("Atualizado", response.nome());
            assertEquals("Nova observação", response.observacao());
        }

    }

    @Test
    void shouldThrowExceptionWhileUpdateWhenSectionNotFound() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            when(sectionRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.empty());

            assertThrows(EntityNotFoundException.class, () -> sectionService.update(1L, new CreateSectionDTO("Nome", "Obs")));
        }
    }

    @Test
    void shouldThrowExceptionWhileUpdateWhenNameAlreadyExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            CreateSectionDTO dto = new CreateSectionDTO("Duplicado", "Obs");
            Section existing = new Section("Duplicado", "Obs", Status.ACTIVE.value, new User());
            Section current = new Section("Atual", "Obs", Status.ACTIVE.value, new User());

            when(sectionRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.of(current));
            when(userDomainService.findByID(any())).thenReturn(new User());
            when(sectionDomainService.findByName("Duplicado")).thenReturn(Optional.of(current));

            assertThrows(EntityAlreadyExistsException.class, () -> sectionService.update(1L, dto));
        }

    }

    @Test
    void shouldInactivateSectionAndRoomsWhenExists() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            User user = new User(); user.setUserId(1L);
            Section section = new Section("TI", "Obs", Status.ACTIVE.value, user);
            section.setId(1L);

            Room room = new Room(); room.setId(1L); room.setStatus(Status.ACTIVE.value);
            section.setRooms(List.of(room));

            when(sectionRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.of(section));
            when(userDomainService.findByID(any())).thenReturn(user);

            sectionService.delete(1L);

            assertEquals(Status.INACTIVE.value, section.getStatus());
            assertEquals(Status.INACTIVE.value, room.getStatus());
            verify(sectionRepository).save(section);
        }
    }

    @Test
    void shouldThrowExceptionWhileDeleteWhenSectionNotFound() {
        try (MockedStatic<CurrentUserUtils> mocked = mockStatic(CurrentUserUtils.class)) {
            mocked.when(CurrentUserUtils::getCurrentUserID).thenReturn(1L);

            when(sectionRepository.findByIdAndStatus(1L, Status.ACTIVE.value)).thenReturn(Optional.empty());

            assertThrows(EntityNotFoundException.class, () -> sectionService.delete(1L));
        }
    }
}
