package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateUserDto;
import br.ufs.coffee_rep_gds_backend.dtos.request.LoginRequest;
import br.ufs.coffee_rep_gds_backend.entities.Role;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.repositories.RoleRepository;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import br.ufs.coffee_rep_gds_backend.exceptions.BadParametersException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;


@ExtendWith(MockitoExtension.class)
class AuthServiceTest {


    @Mock
    private JwtEncoder jwtEncoder;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private BCryptPasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    @Mock private JwtEncoderParameters jwtEncoderParameters;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "expiresIn", 3600L);
    }

    @Test
    void shouldReturnTokenWhenCredentialsAreValid() {
        var loginRequest = new LoginRequest("12345678900", "senha123");
        var user = mock(User.class);
        var role = new Role();
        role.setName("USER");

        when(userRepository.findByCpf("12345678900")).thenReturn(Optional.of(user));
        when(user.isLoginCorrect(eq(loginRequest), any())).thenReturn(true);
        when(user.getRoles()).thenReturn(Set.of(role));

        var jwt = mock(JwtEncoderParameters.class);
        var jwtToken = mock(org.springframework.security.oauth2.jwt.Jwt.class);
        when(jwtEncoder.encode(any())).thenReturn(jwtToken);
        when(jwtToken.getTokenValue()).thenReturn("fake-jwt-token");

        var response = authService.authenticate(loginRequest);
        
        assertEquals("fake-jwt-token", response.accessToken());
        assertEquals(3600L, response.expiresIn());
    }

    @Test
    void shouldThrowExceptionWhenUserNotFound() {
        var loginRequest = new LoginRequest("00000000000", "senha");

        when(userRepository.findByCpf("00000000000")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> authService.authenticate(loginRequest));
    }

    @Test
    void shouldSaveUserWhenDataIsValid() throws Exception {
        var dto = new CreateUserDto("Nome", "999999999", "senha123", "email@teste.com", "31833783026", "1990-01-01");

        var role = new Role();
        role.setName("BASIC");

        when(roleRepository.findByName("BASIC")).thenReturn(Optional.of(role));
        when(userRepository.findByCpf(dto.cpf())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(dto.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("senha123")).thenReturn("encodedPassword");

        authService.register(dto);

        verify(userRepository).save(any(User.class));
    }

    @Test
    void shouldThrowExceptionWhenRoleNotFound() {
        var dto = new CreateUserDto("Nome", "12345678900", "email@teste.com", "senha123", "1990-01-01", "999999999");

        when(roleRepository.findByName("BASIC")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> authService.register(dto));
    }

    @Test
    void shouldThrowExceptionWhenUserAlreadyExists() {
        var dto = new CreateUserDto("Nome", "12345678900", "email@teste.com", "senha123", "1990-01-01", "999999999");

        when(roleRepository.findByName("BASIC")).thenReturn(Optional.of(new Role()));
        when(userRepository.findByCpf(dto.cpf())).thenReturn(Optional.of(new User()));

        assertThrows(EntityAlreadyExistsException.class, () -> authService.register(dto));
    }

    @Test
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        var dto = new CreateUserDto("Nome", "999999999", "senha123", "email@teste.com", "31833783026", "1990-01-01");

        when(roleRepository.findByName("BASIC")).thenReturn(Optional.of(new Role()));
        when(userRepository.findByCpf(dto.cpf())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(dto.email())).thenReturn(Optional.of(new User()));

        var exception = assertThrows(EntityAlreadyExistsException.class, () -> authService.register(dto));

        assertEquals("Este e-mail já está cadastrado.", exception.getMessage());
    }

    @Test
    void shouldThrowExceptionWhenBirthDateIsInvalid() {
        var dto = new CreateUserDto("Nome", "12345678900", "email@teste.com", "senha123", "01-01-1990", "999999999");

        when(roleRepository.findByName("BASIC")).thenReturn(Optional.of(new Role()));
        when(userRepository.findByCpf(dto.cpf())).thenReturn(Optional.empty());

        assertThrows(BadParametersException.class, () -> authService.register(dto));
    }

}