package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import jakarta.persistence.criteria.Expression;
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

            Expression<Object> maxDate = criteriaBuilder.selectCase()
                    .when(criteriaBuilder.greaterThan(root.get("updatedAt"), root.get("createdAt")), root.get("updatedAt"))
                    .otherwise(root.get("createdAt"));

            query.orderBy(criteriaBuilder.desc(maxDate));

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));

        };
    }

    /**
     * Conflito de horário: mesma sala e intervalos datetime que se intersectam
     * (existing.start &lt; end AND existing.end &gt; start).
     * Uso exclusivo na criação de reservas; listagens usam {@link #filter}.
     */
    public static Specification<Reservation> overlapsApprovedInRoom(Long roomId, LocalDateTime start, LocalDateTime end) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.and(
                criteriaBuilder.equal(root.get("room").get("id"), roomId),
                criteriaBuilder.lessThan(root.get("startDate"), end),
                criteriaBuilder.greaterThan(root.get("endDate"), start)
        );
    }
}
