package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@SuppressWarnings("DuplicatedCode")
public class ReservationSpecification {

    public static Specification<Reservation> filter(String requesterName, String roomName, Long roomId, Long requesterId, String sectionName, Long sectionId, LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (requesterName != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("requester").get("name")), "%" + requesterName.toLowerCase() + "%"));
            }

            if (roomName != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("room").get("name")), "%" + roomName.toLowerCase() + "%"));
            }

            if (roomId != null) {
                predicates.add(criteriaBuilder.equal(root.get("room").get("id"), roomId));
            }

            if (requesterId != null) {
                predicates.add(criteriaBuilder.equal(root.get("requester").get("id"), requesterId));
            }

            if (sectionName != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("room").get("section").get("name")), "%" + sectionName.toLowerCase() + "%"));
            }

            if (sectionId != null) {
                predicates.add(criteriaBuilder.equal(root.get("room").get("section").get("id"), sectionId));
            }

            if (startDate != null && endDate != null) {
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.and(
                                criteriaBuilder.greaterThanOrEqualTo(root.get("startDate"), startDate),
                                criteriaBuilder.lessThanOrEqualTo(root.get("endDate"), endDate)
                        ),
                        criteriaBuilder.and(
                                criteriaBuilder.lessThanOrEqualTo(root.get("startDate"), startDate),
                                criteriaBuilder.greaterThanOrEqualTo(root.get("endDate"), startDate)
                        ),
                        criteriaBuilder.and(
                                criteriaBuilder.lessThanOrEqualTo(root.get("startDate"), endDate),
                                criteriaBuilder.greaterThanOrEqualTo(root.get("endDate"), endDate)
                        ),
                        criteriaBuilder.and(
                                criteriaBuilder.lessThanOrEqualTo(root.get("startDate"), startDate),
                                criteriaBuilder.greaterThanOrEqualTo(root.get("endDate"), endDate)
                        )
                ));
            }

            query.orderBy(criteriaBuilder.desc(root.get("id")));

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));

        };
    }
}
