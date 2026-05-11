package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterAbsenceDto;
import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.RequesterAbsence;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.exceptions.BadParametersException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterAbsenceRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.RequesterDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.UserDomainService;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequesterAbsenceServiceTest {

    @Mock
    private RequesterAbsenceRepository absenceRepository;
    @Mock
    private RequesterDomainService requesterService;
    @Mock
    private UserDomainService userDomainService;

    @InjectMocks
    private RequesterAbsenceService absenceService;

    @Test
    void shouldListAllAbsencesWhenRequesterIdIsNull() {
        Requester requester = mock(Requester.class);
        when(requester.getId()).thenReturn(1L);
        when(requester.getName()).thenReturn("Dr. Teste");
        RequesterAbsence absence = new RequesterAbsence(requester, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 5), new User());
        absence.setId(10L);
        when(absenceRepository.findAll()).thenReturn(List.of(absence));

        assertEquals(1, absenceService.findAll(null).size());
    }

    @Test
    void shouldRejectInvalidDateRange() {
        CreateRequesterAbsenceDto dto = new CreateRequesterAbsenceDto(1L, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1));

        assertThrows(BadParametersException.class, () -> absenceService.create(dto));
    }

    @Test
    void shouldDeleteExistingAbsence() {
        when(absenceRepository.existsById(1L)).thenReturn(true);

        absenceService.delete(1L);

        verify(absenceRepository).deleteById(1L);
    }

    @Test
    void shouldThrowWhenDeletingMissingAbsence() {
        when(absenceRepository.existsById(99L)).thenReturn(false);

        assertThrows(EntityNotFoundException.class, () -> absenceService.delete(99L));
    }

    @Test
    void shouldCreateAbsence() {
        CreateRequesterAbsenceDto dto = new CreateRequesterAbsenceDto(1L, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 5));
        Requester requester = mock(Requester.class);
        when(requester.getId()).thenReturn(1L);
        when(requester.getName()).thenReturn("Dr. Teste");
        when(requesterService.getRequesterById(1L)).thenReturn(requester);
        when(userDomainService.findByID(7L)).thenReturn(new User());

        RequesterAbsence saved = new RequesterAbsence(requester, dto.dataInicio(), dto.dataFim(), new User());
        saved.setId(5L);
        when(absenceRepository.save(any(RequesterAbsence.class))).thenReturn(saved);

        try (MockedStatic<CurrentUserUtils> currentUser = org.mockito.Mockito.mockStatic(CurrentUserUtils.class)) {
            currentUser.when(CurrentUserUtils::getCurrentUserID).thenReturn(7L);
            assertEquals(5L, absenceService.create(dto).id());
        }
    }

    @Test
    void shouldUpdateAbsence() {
        CreateRequesterAbsenceDto dto = new CreateRequesterAbsenceDto(1L, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 8));
        Requester requester = mock(Requester.class);
        when(requester.getId()).thenReturn(1L);
        when(requester.getName()).thenReturn("Dr. Teste");
        RequesterAbsence existing = new RequesterAbsence(requester, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 3), new User());
        existing.setId(3L);
        when(absenceRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(requesterService.getRequesterById(1L)).thenReturn(requester);
        when(userDomainService.findByID(7L)).thenReturn(new User());
        when(absenceRepository.save(existing)).thenReturn(existing);

        try (MockedStatic<CurrentUserUtils> currentUser = org.mockito.Mockito.mockStatic(CurrentUserUtils.class)) {
            currentUser.when(CurrentUserUtils::getCurrentUserID).thenReturn(7L);
            assertEquals(LocalDate.of(2026, 1, 8), absenceService.update(3L, dto).dataFim());
        }
    }
}
