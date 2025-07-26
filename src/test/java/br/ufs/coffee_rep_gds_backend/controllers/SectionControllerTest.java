package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateSectionDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateSectionResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.SectionResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.SectionService;
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
@WebMvcTest(SectionController.class)
@AutoConfigureMockMvc(addFilters = false)
class SectionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SectionService sectionService;

    @Test
    void shouldReturnPagedSectionsWhenUnpagedIsFalse() throws Exception {
        Page<SectionResponseDto> page = new PageImpl<>(List.of(new SectionResponseDto(1L, "Setor 1", "Observacao")));
        Mockito.when(sectionService.findAllActive(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/section")
                        .param("unpaged", "false")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void shouldReturnUnpagedSectionsWhenUnpagedIsTrue() throws Exception {
        List<SectionResponseDto> list = List.of(new SectionResponseDto(1L, "Setor 1", "Observacao"));
        Mockito.when(sectionService.findAllActive(any())).thenReturn(list);

        mockMvc.perform(get("/api/section")
                        .param("unpaged", "true")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void shouldCreateSection() throws Exception {
        CreateSectionDTO dto = new CreateSectionDTO("Setor 1", "Observacao");
        CreateSectionResponseDTO response = new CreateSectionResponseDTO(1L, "Setor 1", "Observacao");
        Mockito.when(sectionService.create(any())).thenReturn(response);

        mockMvc.perform(post("/api/section")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(dto)))
                .andExpect(status().isCreated());
    }

    @Test
    void shouldUpdateSection() throws Exception {
        CreateSectionDTO dto = new CreateSectionDTO("Setor 1", "Observacao");
        CreateSectionResponseDTO response = new CreateSectionResponseDTO(1L, "Setor 1", "Observacao");
        Mockito.when(sectionService.update(eq(1L), any())).thenReturn(response);

        mockMvc.perform(put("/api/section/1")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    void shouldDeleteSection() throws Exception {
        Mockito.doNothing().when(sectionService).delete(1L);

        mockMvc.perform(delete("/api/section/1")
                        .with(jwt()))
                .andExpect(status().isNoContent());
    }
}
