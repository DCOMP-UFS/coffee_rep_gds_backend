package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ReservationSpecification {

    public static Specification<Reservation> filter(String requesterName, String roomName, LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (requesterName != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("requester").get("name")), "%" + requesterName + "%"));
            }

            if (roomName != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("room").get("name")), "%" + roomName + "%"));
            }

            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("startDate"), startDate));
            }

            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("endDate"), endDate));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));

        };
    }
}
