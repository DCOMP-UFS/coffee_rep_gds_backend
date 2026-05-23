package br.ufs.coffee_rep_gds_backend.integration;

import br.ufs.coffee_rep_gds_backend.integration.support.IntegrationTestCpfs;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReservationAndAbsenceIntegrationIT extends AbstractPostgresIntegrationTest {

    private static final ZoneId SERGIPE = ZoneId.of("America/Maceio");

    @Test
    void reservationLifecycleAndProfessionalAbsenceFlag() throws Exception {
        long sectionId = createSection("Setor Reserva");
        long roomId = createRoom("Sala Reserva", sectionId);
        long requesterId = createRequester("Dr. Reserva", IntegrationTestCpfs.RESERVATION_FLOW);

        LocalDateTime start = LocalDateTime.now(SERGIPE).minusHours(1);
        LocalDateTime end = LocalDateTime.now(SERGIPE).plusHours(2);
        long reservationId = createReservation(roomId, requesterId, start, end);

        mockMvc.perform(get("/api/reservation")
                        .header("Authorization", bearer())
                        .param("inicio", start.minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .param("fim", end.plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].profissionalAusente").value(false));

        LocalDate today = LocalDate.now(SERGIPE);
        mockMvc.perform(post("/api/requester-absence")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"solicitanteId":%d,"dataInicio":"%s","dataFim":"%s"}
                                """, requesterId, today, today)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/reservation")
                        .header("Authorization", bearer())
                        .param("inicio", start.minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .param("fim", end.plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].profissionalAusente").value(true));

        mockMvc.perform(patch("/api/reservation/{id}", reservationId)
                        .header("Authorization", bearer()))
                .andExpect(status().isNoContent());
    }

    @Test
    void activeReservationWithAbsenceDoesNotMarkRoomOccupied() throws Exception {
        long sectionId = createSection("Setor Ocupação");
        long roomId = createRoom("Sala Livre", sectionId);
        long requesterId = createRequester("Dr. Ausente", IntegrationTestCpfs.ABSENCE_BLOCKS_RESERVATION);

        LocalDateTime start = LocalDateTime.now(SERGIPE).minusHours(1);
        LocalDateTime end = LocalDateTime.now(SERGIPE).plusHours(2);
        createReservation(roomId, requesterId, start, end);

        LocalDate today = LocalDate.now(SERGIPE);
        mockMvc.perform(post("/api/requester-absence")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"solicitanteId":%d,"dataInicio":"%s","dataFim":"%s"}
                                """, requesterId, today, today)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/room")
                        .header("Authorization", bearer())
                        .param("unpaged", "true")
                        .param("ocupada", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + roomId + ")].ocupada").value(false));
    }

    @Test
    void recurrentReservationsAllowDifferentTimeSlotsOnSameDays() throws Exception {
        long sectionId = createSection("Setor Recorrência Horário");
        long roomId = createRoom("Sala Recorrência Horário", sectionId);
        long requesterId = createRequester("Dr. Horário", "74682489070");

        createRecurrentReservation(
                roomId,
                requesterId,
                "2030-05-27T08:00:00",
                "2030-05-30T12:00:00",
                "1,2,3,4"
        );

        createRecurrentReservation(
                roomId,
                requesterId,
                "2030-05-27T14:00:00",
                "2030-05-30T18:00:00",
                "1,2,3,4"
        );

        mockMvc.perform(post("/api/reservation")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"salaId":%d,"solicitanteId":%d,"horaInicio":"2030-05-27T10:00:00","horaFim":"2030-05-27T11:00:00","observacoes":"","fixo":false}
                                """, roomId, requesterId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Já existe uma reserva para esta sala no horário solicitado!"));
    }

    @Test
    void requesterAbsenceCrudAndValidation() throws Exception {
        long requesterId = createRequester("Dr. Férias", IntegrationTestCpfs.ABSENCE_CRUD);
        LocalDate start = LocalDate.now(SERGIPE).plusDays(5);
        LocalDate end = LocalDate.now(SERGIPE).plusDays(10);

        String createResponse = mockMvc.perform(post("/api/requester-absence")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"solicitanteId":%d,"dataInicio":"%s","dataFim":"%s"}
                                """, requesterId, start, end)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.solicitanteId").value((int) requesterId))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long absenceId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/api/requester-absence")
                        .header("Authorization", bearer())
                        .param("solicitanteId", String.valueOf(requesterId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value((int) absenceId));

        LocalDate updatedEnd = end.plusDays(2);
        mockMvc.perform(put("/api/requester-absence/{id}", absenceId)
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"solicitanteId":%d,"dataInicio":"%s","dataFim":"%s"}
                                """, requesterId, start, updatedEnd)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dataFim").value(updatedEnd.toString()));

        mockMvc.perform(post("/api/requester-absence")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"solicitanteId":%d,"dataInicio":"%s","dataFim":"%s"}
                                """, requesterId, end.plusDays(20), end.plusDays(10))))
                .andExpect(status().isNotAcceptable());

        mockMvc.perform(delete("/api/requester-absence/{id}", absenceId)
                        .header("Authorization", bearer()))
                .andExpect(status().isNoContent());
    }

    private long createSection(String name) throws Exception {
        String response = mockMvc.perform(post("/api/section")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"nome":"%s","observacao":""}
                                """, name)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private long createRoom(String name, long sectionId) throws Exception {
        String response = mockMvc.perform(post("/api/room")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"nome":"%s","setorId":%d}
                                """, name, sectionId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private long createRequester(String name, String cpf) throws Exception {
        String response = mockMvc.perform(post("/api/requester")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"nome":"%s","cpf":"%s","telefone":"79999990000","especialidade":"Clínica"}
                                """, name, cpf)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private void createRecurrentReservation(
            long roomId,
            long requesterId,
            String horaInicio,
            String horaFim,
            String diasCsv
    ) throws Exception {
        mockMvc.perform(post("/api/reservation")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"salaId":%d,"solicitanteId":%d,"horaInicio":"%s","horaFim":"%s","observacoes":"","fixo":true,"dias":[%s]}
                                """, roomId, requesterId, horaInicio, horaFim, diasCsv)))
                .andExpect(status().isCreated());
    }

    private long createReservation(long roomId, long requesterId, LocalDateTime start, LocalDateTime end)
            throws Exception {
        String response = mockMvc.perform(post("/api/reservation")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"salaId":%d,"solicitanteId":%d,"horaInicio":"%s","horaFim":"%s","observacoes":"","fixo":false}
                                """, roomId, requesterId, start.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME), end.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }
}
