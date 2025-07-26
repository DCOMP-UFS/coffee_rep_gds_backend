package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.config.SecurityConfig;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Import(SecurityConfig.class)
@ExtendWith(MockitoExtension.class)
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void shouldListUsersWhenUserHasAdminScope() throws Exception {
        List<User> users = List.of(new User());
        Mockito.when(userRepository.findAll()).thenReturn(users);

        mockMvc.perform(get("/api/user")
                        .with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void shouldReturnUserNameWhenUserHasAdminScope() throws Exception {
        User user = new User();
        user.setUserId(1L);
        user.setName("Admin User");

        Mockito.when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/user/authority")
                        .with(jwt().jwt(jwt -> jwt.subject("1"))
                                .authorities(new SimpleGrantedAuthority("SCOPE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(content().string("Admin User"));
    }

    @Test
    void shouldReturnUserNameWhenUserHasBasicScope() throws Exception {
        User user = new User();
        user.setUserId(2L);
        user.setName("Basic User");

        Mockito.when(userRepository.findById(2L)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/user/authority")
                        .with(jwt().jwt(jwt -> jwt.subject("2"))
                                .authorities(new SimpleGrantedAuthority("SCOPE_BASIC"))))
                .andExpect(status().isOk())
                .andExpect(content().string("Basic User"));
    }

    @Test
    void shouldReturnUserNameWhenNoAuthorityRequired() throws Exception {
        User user = new User();
        user.setUserId(3L);
        user.setName("No Scope User");

        Mockito.when(userRepository.findById(3L)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/user/noauthority")
                        .with(jwt().jwt(jwt -> jwt.subject("3"))))
                .andExpect(status().isOk())
                .andExpect(content().string("No Scope User"));
    }
}
