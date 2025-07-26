package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class RequesterDomainServiceTest {

    @Mock
    private RequesterRepository requesterRepository;

    @InjectMocks
    private RequesterDomainService requesterDomainService;

    @Test
    void shouldReturnRequesterWhenExists() {
        Requester requester = new Requester();
        requester.setId(1L);
        requester.setName("Fulano");

        when(requesterRepository.findById(1L)).thenReturn(Optional.of(requester));

        Requester result = requesterDomainService.getRequesterById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("Fulano", result.getName());
    }

    @Test
    void shouldThrowExceptionWhenRequesterNotFound() {
        when(requesterRepository.findById(1L)).thenReturn(Optional.empty());

        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> {
            requesterDomainService.getRequesterById(1L);
        });

        assertEquals("Solicitante não encontrado", exception.getMessage());
    }
}
