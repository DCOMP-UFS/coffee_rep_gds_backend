package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.CreateReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.ReservationResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.ReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@WebMvcTest(ReservationController.class)
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReservationService reservationService;

    @Test
    void shouldReturnPageOfReservations() throws Exception {
        ReservationResponseDto dto = new ReservationResponseDto(
                1L, LocalDateTime.now(), LocalDateTime.now().plusHours(1),
                "Sala A", "Fulano", "Clinico", "Admin", 1L, 1L, 1L, null,
                false
        );

        Page<ReservationResponseDto> page = new PageImpl<>(List.of(dto));

        when(reservationService.findAll(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/reservation")
                        .param("inicio", "2025-07-01T10:00:00")
                        .param("fim", "2025-07-31T18:00:00")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].sala").value("Sala A"));
    }

    @Test
    void shouldReturnCreatedReservation() throws Exception {
        CreateReservationResponseDto responseDto = new CreateReservationResponseDto(
                1L, LocalDateTime.now(), LocalDateTime.now().plusHours(1), "Fulano", "Sala A", null
        );

        when(reservationService.createReservation(any())).thenReturn(responseDto);

        mockMvc.perform(post("/api/reservation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "horaInicio": "2025-07-25T10:00:00",
                                "horaFim": "2025-07-25T11:00:00",
                                "observacoes": "Reunião",
                                "fixo": false,
                                "dias": [],
                                "salaId": 1,
                                "solicitanteId": 2
                            }
                        """)
                        .with(jwt()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roomName").value("Sala A"));
    }

    @Test
    void shouldReturnReservationsInCurrentMonth() throws Exception {
        ReservationResponseDto dto = new ReservationResponseDto(
                1L, LocalDateTime.now(), LocalDateTime.now().plusHours(1),
                "Sala A", "Fulano", "TI", "Admin", 1L, 1L, 1L, null,
                false
        );

        when(reservationService.findReservationsInCurrentMonth(any(), any()))
                .thenReturn(List.of(dto));

        mockMvc.perform(get("/api/reservation/current-month")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sala").value("Sala A"));
    }

    @Test
    void shouldReturnNoContentWhenCancelReservation() throws Exception {
        doNothing().when(reservationService).cancelReservation(1L);

        mockMvc.perform(patch("/api/reservation/1")
                        .with(jwt()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnNoContentWhenCancelRecurrentReservation() throws Exception {
        doNothing().when(reservationService).cancelRecurrentReservation(99L);

        mockMvc.perform(delete("/api/reservation/recurrent/99")
                        .with(jwt()))
                .andExpect(status().isNoContent());
    }
}
