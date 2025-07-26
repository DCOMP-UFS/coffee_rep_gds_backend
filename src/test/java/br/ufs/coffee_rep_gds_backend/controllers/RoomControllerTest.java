package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRoomDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRoomResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.RoomService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;

import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@WebMvcTest(RoomController.class)
@AutoConfigureMockMvc(addFilters = false)
class RoomControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    @Test
    void shouldReturnPagedRoomsWhenUnpagedIsFalse() throws Exception {
        Page<RoomResponseDto> page = new PageImpl<>(List.of(new RoomResponseDto(1L, "Sala 1", "Setor 1", 1L, false)));
        Mockito.when(roomService.getAllActiveRooms(any(), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/room")
                        .param("unpaged", "false")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void shouldReturnUnpagedRoomsWhenUnpagedIsTrue() throws Exception {
        List<RoomResponseDto> list = List.of(new RoomResponseDto(1L, "Sala 1", "Setor 1", 1L, false));
        Mockito.when(roomService.getAllActiveRoomsUnpaged(any(), any(), any())).thenReturn(list);

        mockMvc.perform(get("/api/room")
                        .param("unpaged", "true")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void shouldReturnRoomById() throws Exception {
        RoomResponseDto dto = new RoomResponseDto(1L, "Sala 1", "Setor 1", 1L, false);
        Mockito.when(roomService.getRoomById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/room/1")
                        .with(jwt()))
                .andExpect(status().isOk());
    }

    @Test
    void shouldReturnRoomsBySectionIdPaged() throws Exception {
        Page<RoomResponseDto> page = new PageImpl<>(List.of(new RoomResponseDto(1L, "Sala 1", "Setor 1", 1L, false)));
        Mockito.when(roomService.getRoomsBySectionId(anyLong(), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/room/section/1")
                        .param("unpaged", "false")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void shouldReturnRoomsBySectionIdUnpaged() throws Exception {
        List<RoomResponseDto> list = List.of(new RoomResponseDto(1L, "Sala 1", "Setor 1", 1L, false));
        Mockito.when(roomService.getRoomsBySectionIdUnpaged(anyLong(), any(), any())).thenReturn(list);

        mockMvc.perform(get("/api/room/section/1")
                        .param("unpaged", "true")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void shouldCreateRoom() throws Exception {
        CreateRoomDTO dto = new CreateRoomDTO("Sala 1", 1L);
        CreateRoomResponseDTO response = new CreateRoomResponseDTO(1L, "Sala 1", "Setor 1");
        Mockito.when(roomService.create(any())).thenReturn(response);

        mockMvc.perform(post("/api/room")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(dto)))
                .andExpect(status().isCreated());
    }

    @Test
    void shouldUpdateRoom() throws Exception {
        CreateRoomDTO dto = new CreateRoomDTO("Sala 1", 1L);
        CreateRoomResponseDTO response = new CreateRoomResponseDTO(1L, "Sala 1", "Setor 1");
        Mockito.when(roomService.update(eq(1L), any())).thenReturn(response);

        mockMvc.perform(put("/api/room/1")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    void shouldDeleteRoom() throws Exception {
        Mockito.doNothing().when(roomService).delete(1L);

        mockMvc.perform(delete("/api/room/1")
                        .with(jwt()))
                .andExpect(status().isNoContent());
    }
}
