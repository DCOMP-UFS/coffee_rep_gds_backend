package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.request.UpdateRequesterDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRequesterResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDetailDto;
import br.ufs.coffee_rep_gds_backend.dtos.response.RequesterResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.RequesterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@WebMvcTest(RequesterController.class)
@AutoConfigureMockMvc
class RequesterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RequesterService requesterService;

    @Test
    void shouldReturnPagedListWhenUnpagedIsFalse() throws Exception {
        Page<RequesterResponseDto> page = new PageImpl<>(List.of(
                new RequesterResponseDto(1L, "Nome", "12345678909", "99999999", "Medico")
        ));

        when(requesterService.getAllRequesters(any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/requester")
                        .param("unpaged", "false")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nome").value("Nome"));
    }

    @Test
    void shouldReturnUnpagedListWhenUnpagedIsTrue() throws Exception {
        List<RequesterResponseDto> list = List.of(
                new RequesterResponseDto(1L, "Nome", "12345678909", "99999999", "Medico")
        );

        when(requesterService.getAllRequesters(any(), any())).thenReturn(list);

        mockMvc.perform(get("/api/requester")
                        .param("unpaged", "true")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Nome"));
    }

    @Test
    void shouldReturnRequesterWhenExists() throws Exception {
        RequesterResponseDetailDto dto = new RequesterResponseDetailDto(1L, "Nome", "12345678909", "99999999", "Medico");

        when(requesterService.getRequesterById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/requester/1").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nome"));
    }

    @Test
    void shouldReturnRequestersByRequesterType() throws Exception {
        Page<RequesterResponseDto> page = new PageImpl<>(List.of(
                new RequesterResponseDto(1L, "Nome", "12345678909", "99999999", "Medico")
        ));

        when(requesterService.getRequestersByRequesterTypeId(eq(1L), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/requester/type/1").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nome").value("Nome"));
    }

    @Test
    void shouldReturnCreatedRequester() throws Exception {
        CreateRequesterDTO dto = new CreateRequesterDTO("Nome", "12345678909", "99999999", "Medico");
        CreateRequesterResponseDTO response = new CreateRequesterResponseDTO(1L, "Nome", "12345678909", "99999999", "Medico");

        when(requesterService.create(any())).thenReturn(response);

        mockMvc.perform(post("/api/requester")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "nome": "Nome",
                                "cpf": "12345678909",
                                "telefone": "99999999",
                                "especialidade": "Medico"
                            }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Nome"));
    }

    @Test
    void shouldReturnUpdatedRequester() throws Exception {
        UpdateRequesterDTO dto = new UpdateRequesterDTO("Nome Atualizado", "12345678909", "99999999", "Medico");
        CreateRequesterResponseDTO response = new CreateRequesterResponseDTO(1L, "Nome Atualizado", "12345678909", "99999999", "Medico");

        when(requesterService.update(eq(1L), any())).thenReturn(response);

        mockMvc.perform(put("/api/requester/1")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "name": "Nome Atualizado",
                                "cpf": "12345678909",
                                "telefone": "99999999",
                                "especialidade": "Medico"
                            }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nome Atualizado"));
    }

    @Test
    void shouldReturnNoContent() throws Exception {
        doNothing().when(requesterService).delete(1L);

        mockMvc.perform(delete("/api/requester/1").with(jwt()))
                .andExpect(status().isNoContent());
    }
}
