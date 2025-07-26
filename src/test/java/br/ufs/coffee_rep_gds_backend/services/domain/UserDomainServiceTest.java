package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class UserDomainServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserDomainService userDomainService;

    @Test
    void shouldReturnUserByIdWhenUserExists() {
        User user = new User();
        user.setUserId(1L);
        user.setName("Nome");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        User result = userDomainService.findByID(1L);

        assertNotNull(result);
        assertEquals("Nome", result.getName());
    }

    @Test
    void shouldThrowExceptionWhenUserIdNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> {
            userDomainService.findByID(99L);
        });

        assertEquals("Usuário não encontrado!", exception.getMessage());
    }
}
