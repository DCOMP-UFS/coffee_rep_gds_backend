package br.ufs.coffee_rep_gds_backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RoomCrudIntegrationIT extends AbstractPostgresIntegrationTest {

    @Test
    void roomCrudLifecycle() throws Exception {
        String sectionResponse = mockMvc.perform(post("/api/section")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Setor Sala","observacao":""}
                                """))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long sectionId = objectMapper.readTree(sectionResponse).get("id").asLong();

        String roomResponse = mockMvc.perform(post("/api/room")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"nome":"Sala 101","setorId":%d}
                                """, sectionId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Sala 101"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long roomId = objectMapper.readTree(roomResponse).get("id").asLong();

        mockMvc.perform(get("/api/room/{id}", roomId)
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Sala 101"));

        mockMvc.perform(put("/api/room/{id}", roomId)
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"nome":"Sala 102","setorId":%d}
                                """, sectionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Sala 102"));

        mockMvc.perform(delete("/api/room/{id}", roomId)
                        .header("Authorization", bearer()))
                .andExpect(status().isNoContent());
    }
}
