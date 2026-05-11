package br.ufs.coffee_rep_gds_backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RequesterCrudIntegrationIT extends AbstractPostgresIntegrationTest {

    @Test
    void requesterCrudLifecycle() throws Exception {
        String createBody = """
                {"nome":"Dr. Integração","cpf":"39053344705","telefone":"79999998888","especialidade":"Clínica"}
                """;

        String createResponse = mockMvc.perform(post("/api/requester")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long requesterId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/requester/{id}", requesterId)
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Dr. Integração"));

        mockMvc.perform(put("/api/requester/{id}", requesterId)
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Dr. Atualizado","cpf":"39053344705","telefone":"79999997777","especialidade":"Pediatria"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Dr. Atualizado"));

        mockMvc.perform(delete("/api/requester/{id}", requesterId)
                        .header("Authorization", bearer()))
                .andExpect(status().isNoContent());
    }
}
