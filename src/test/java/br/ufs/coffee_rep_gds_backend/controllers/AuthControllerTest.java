package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateUserDto;
import br.ufs.coffee_rep_gds_backend.dtos.request.LoginRequest;
import br.ufs.coffee_rep_gds_backend.dtos.response.LoginResponse;
import br.ufs.coffee_rep_gds_backend.services.application.AuthService;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;


@AutoConfigureMockMvc
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Test
    void shouldReturnTokenWhenCredentialsAreValid() throws Exception {
        LoginRequest loginRequest = new LoginRequest("12345678909", "1234");
        LoginResponse loginResponse = new LoginResponse("fake-jwt-token", 3600L);

        when(authService.authenticate(any(LoginRequest.class))).thenReturn(loginResponse);

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "cpf": "12345678909",
                                "password": "1234"
                            }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("fake-jwt-token"))
                .andExpect(jsonPath("$.expiresIn").value(3600L));
    }

    @Test
    void shouldReturnOkWhenUserIsCreated() throws Exception {
        doNothing().when(authService).register(any(CreateUserDto.class));

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .with(user("12345678909").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "name": "Nome",
                                "cpf": "12345678909",
                                "email": "nome@email.com",
                                "password": "senha123",
                                "birthDate": "1990-01-01",
                                "phone": "999999999"
                            }
                        """))
                .andExpect(status().isOk());
    }
}
