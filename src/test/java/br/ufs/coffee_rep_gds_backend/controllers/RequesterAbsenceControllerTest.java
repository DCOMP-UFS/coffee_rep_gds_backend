package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterAbsenceDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterAbsenceResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.RequesterAbsenceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@WebMvcTest(RequesterAbsenceController.class)
@AutoConfigureMockMvc(addFilters = false)
class RequesterAbsenceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RequesterAbsenceService absenceService;

    @Test
    void shouldListAbsences() throws Exception {
        Mockito.when(absenceService.findAll(1L))
                .thenReturn(List.of(new RequesterAbsenceResponseDto(1L, 1L, "Dr. Teste", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 10))));

        mockMvc.perform(get("/api/requester-absence")
                        .param("solicitanteId", "1")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void shouldCreateAbsence() throws Exception {
        Mockito.when(absenceService.create(any())).thenReturn(
                new RequesterAbsenceResponseDto(1L, 1L, "Dr. Teste", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 10)));

        mockMvc.perform(post("/api/requester-absence")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"solicitanteId":1,"dataInicio":"2026-01-01","dataFim":"2026-01-10"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.solicitanteId").value(1));
    }

    @Test
    void shouldUpdateAbsence() throws Exception {
        Mockito.when(absenceService.update(eq(1L), any())).thenReturn(
                new RequesterAbsenceResponseDto(1L, 1L, "Dr. Teste", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 15)));

        mockMvc.perform(put("/api/requester-absence/{id}", 1L)
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"solicitanteId":1,"dataInicio":"2026-01-01","dataFim":"2026-01-15"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dataFim").value("2026-01-15"));
    }

    @Test
    void shouldDeleteAbsence() throws Exception {
        mockMvc.perform(delete("/api/requester-absence/{id}", 1L)
                        .with(jwt()))
                .andExpect(status().isNoContent());
    }
}
