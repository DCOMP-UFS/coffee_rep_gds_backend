package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.ReservationStatus;
import br.ufs.coffee_rep_gds_backend.integration.AbstractPostgresIntegrationTest;
import br.ufs.coffee_rep_gds_backend.integration.support.IntegrationTestCpfs;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import br.ufs.coffee_rep_gds_backend.repositories.ReservationRepository;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import br.ufs.coffee_rep_gds_backend.repositories.SectionRepository;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReservationSpecificationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RequesterRepository requesterRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void overlapsApprovedInRoom_shouldNotMatchWhenOnlyDateRangeOverlapsButTimesDoNot() {
        User admin = userRepository.findByCpf(ADMIN_CPF).orElseThrow();
        Section section = sectionRepository.save(new Section("Setor Overlap Spec", "", 1, admin));
        Room room = roomRepository.save(new Room("Sala Overlap Spec", 1, admin, section));
        Requester requester = requesterRepository.save(
                new Requester("Dr. Manhã", IntegrationTestCpfs.REQUESTER_CRUD, "79999001122", 1, admin, "Cardiologia")
        );

        reservationRepository.save(new Reservation(
                LocalDateTime.of(2030, 5, 27, 8, 0),
                LocalDateTime.of(2030, 5, 27, 12, 0),
                null,
                null,
                room,
                requester,
                ReservationStatus.APPROVED.label,
                admin
        ));

        Specification<Reservation> overlapSpec = ReservationSpecification.overlapsApprovedInRoom(
                room.getId(),
                LocalDateTime.of(2030, 5, 27, 14, 0),
                LocalDateTime.of(2030, 5, 27, 18, 0)
        );

        List<Reservation> conflicts = reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(
                ReservationStatus.APPROVED.label,
                overlapSpec
        );

        assertTrue(conflicts.isEmpty());
    }

    @Test
    void overlapsApprovedInRoom_shouldMatchWhenTimesIntersect() {
        User admin = userRepository.findByCpf(ADMIN_CPF).orElseThrow();
        Section section = sectionRepository.save(new Section("Setor Overlap Spec 2", "", 1, admin));
        Room room = roomRepository.save(new Room("Sala Overlap Spec 2", 1, admin, section));
        Requester requester = requesterRepository.save(
                new Requester("Dr. Tarde", IntegrationTestCpfs.RESERVATION_FLOW, "79999003344", 1, admin, "Cardiologia")
        );

        reservationRepository.save(new Reservation(
                LocalDateTime.of(2030, 5, 28, 8, 0),
                LocalDateTime.of(2030, 5, 28, 12, 0),
                null,
                null,
                room,
                requester,
                ReservationStatus.APPROVED.label,
                admin
        ));

        Specification<Reservation> overlapSpec = ReservationSpecification.overlapsApprovedInRoom(
                room.getId(),
                LocalDateTime.of(2030, 5, 28, 10, 0),
                LocalDateTime.of(2030, 5, 28, 11, 0)
        );

        List<Reservation> conflicts = reservationRepository.findAllByStartDateAndEndDateAndRoom_Id(
                ReservationStatus.APPROVED.label,
                overlapSpec
        );

        assertEquals(1, conflicts.size());
    }
}
