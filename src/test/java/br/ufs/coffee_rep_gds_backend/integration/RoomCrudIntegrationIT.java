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

    @Test
    void listManyRoomsWithPagination() throws Exception {
        long sectionId = createSection("Setor Volume");
        for (int i = 1; i <= 50; i++) {
            createRoom("Sala Volume " + String.format("%02d", i), sectionId);
        }

        mockMvc.perform(get("/api/room")
                        .header("Authorization", bearer())
                        .param("size", "5")
                        .param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(5))
                .andExpect(jsonPath("$.page.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(50)));
    }

    @Test
    void listRoomsWithPagination() throws Exception {
        long sectionId = createSection("Setor Paginação");
        createRoom("Sala Paginação", sectionId);

        mockMvc.perform(get("/api/room")
                        .header("Authorization", bearer())
                        .param("size", "5")
                        .param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nome").exists());
    }

    private long createSection(String name) throws Exception {
        String sectionResponse = mockMvc.perform(post("/api/section")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"nome":"%s","observacao":""}
                                """, name)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(sectionResponse).get("id").asLong();
    }

    private void createRoom(String name, long sectionId) throws Exception {
        mockMvc.perform(post("/api/room")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"nome":"%s","setorId":%d}
                                """, name, sectionId)))
                .andExpect(status().isCreated());
    }
}
