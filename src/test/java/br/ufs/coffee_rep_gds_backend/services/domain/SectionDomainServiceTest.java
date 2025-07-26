package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class SectionDomainServiceTest {

    @Mock
    private SectionRepository sectionRepository;

    @InjectMocks
    private SectionDomainService sectionDomainService;

    @Test
    void shouldReturnOptionalSectionByNameWhenExists() {
        Section section = new Section();
        section.setId(1L);
        section.setName("TI");

        when(sectionRepository.findByNameIgnoreCase("TI")).thenReturn(Optional.of(section));

        Optional<Section> result = sectionDomainService.findByName("TI");

        assertTrue(result.isPresent());
        assertEquals("TI", result.get().getName());
    }

    @Test
    void shouldReturnEmptyWhenNotFoundByName() {
        when(sectionRepository.findByNameIgnoreCase("RH")).thenReturn(Optional.empty());

        Optional<Section> result = sectionDomainService.findByName("RH");

        assertTrue(result.isEmpty());
    }

    @Test
    void shouldReturnSectionByIdWhenExists() {
        Section section = new Section();
        section.setId(2L);
        section.setName("Financeiro");

        when(sectionRepository.findById(2L)).thenReturn(Optional.of(section));

        Section result = sectionDomainService.findById(2L);

        assertNotNull(result);
        assertEquals("Financeiro", result.getName());
    }

    @Test
    void shouldThrowExceptionWhenIdNotFound() {
        when(sectionRepository.findById(99L)).thenReturn(Optional.empty());

        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> {
            sectionDomainService.findById(99L);
        });

        assertEquals("Setor não encontrado", exception.getMessage());
    }

    @Test
    void shouldReturnSectionByIdAndStatusWhenExists() {
        Section section = new Section();
        section.setId(3L);
        section.setName("Jurídico");

        when(sectionRepository.findByIdAndStatus(3L, Status.ACTIVE.value)).thenReturn(Optional.of(section));

        Section result = sectionDomainService.findByIdAndStatus(3L, Status.ACTIVE.value);

        assertNotNull(result);
        assertEquals("Jurídico", result.getName());
    }

    @Test
    void shouldThrowExceptionWhenIdAndStatusNotFound() {
        when(sectionRepository.findByIdAndStatus(3L, Status.ACTIVE.value)).thenReturn(Optional.empty());

        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> {
            sectionDomainService.findByIdAndStatus(3L, Status.ACTIVE.value);
        });

        assertEquals("Setor não encontrado", exception.getMessage());
    }
}
