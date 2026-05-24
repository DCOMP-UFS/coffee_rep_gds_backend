package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.integration.AbstractPostgresIntegrationTest;
import br.ufs.coffee_rep_gds_backend.repositories.RequesterRepository;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequesterSpecificationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private RequesterRepository requesterRepository;

    @Autowired
    private UserRepository userRepository;

    private User admin;

    @BeforeEach
    void setUp() {
        admin = userRepository.findByCpf(ADMIN_CPF).orElseThrow();
    }

    @Test
    void all_shouldMatchByNameSpecialtyOrPhone() {
        requesterRepository.save(new Requester("Dr. Ana Cardio", "79999887766", 1, admin, "Cardiologia"));
        requesterRepository.save(new Requester("Dr. Bruno", "79988776655", 1, admin, "Pediatria"));
        requesterRepository.save(new Requester("Dra. Carla", "79977665544", 1, admin, "Neurologia"));

        assertEquals(1, countActive("ana"));
        assertEquals(1, countActive("pediatria"));
        assertEquals(1, countActive("7998877"));
    }

    @Test
    void all_shouldReturnAllActiveWhenSearchIsBlank() {
        requesterRepository.save(new Requester("Dr. Um", "79999001122", 1, admin, "Clínica"));
        requesterRepository.save(new Requester("Dr. Dois", "79999003344", 1, admin, "Clínica"));

        assertTrue(countActive(null) >= 2);
        assertTrue(countActive("   ") >= 2);
    }

    private long countActive(String busca) {
        Specification<Requester> spec = RequesterSpecification.all(busca);
        List<Requester> results = requesterRepository.findAllByStatusUnpaged(1, spec);
        return results.size();
    }
}
