package br.ufs.coffee_rep_gds_backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SectionCrudIntegrationIT extends AbstractPostgresIntegrationTest {

    @Test
    void sectionCrudLifecycle() throws Exception {
        String createBody = """
                {"nome":"Setor Integração","observacao":"Teste"}
                """;

        String createResponse = mockMvc.perform(post("/api/section")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Setor Integração"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long sectionId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/section")
                        .header("Authorization", bearer())
                        .param("unpaged", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + sectionId + ")].nome").value("Setor Integração"));

        mockMvc.perform(put("/api/section/{id}", sectionId)
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Setor Atualizado","observacao":"Alterado"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Setor Atualizado"));

        mockMvc.perform(delete("/api/section/{id}", sectionId)
                        .header("Authorization", bearer()))
                .andExpect(status().isNoContent());
    }
}
