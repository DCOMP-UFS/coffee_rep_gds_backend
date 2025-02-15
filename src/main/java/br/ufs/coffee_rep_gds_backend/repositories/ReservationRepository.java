package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import br.ufs.coffee_rep_gds_backend.enums.ReservationStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;

public interface ReservationRepository extends JpaRepository<Reservation, Long>, JpaSpecificationExecutor<Reservation> {

    default Page<Reservation> findAllByStartEndDate(LocalDateTime startDate, LocalDateTime endDate, String reservationStatus, Specification<Reservation> spec, Pageable pageable) {
        Specification<Reservation> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) -> criteriaBuilder.greaterThanOrEqualTo(root.get("startDate"), startDate));
        finalSpec = finalSpec.and((root, query, criteriaBuilder) -> criteriaBuilder.lessThanOrEqualTo(root.get("endDate"), endDate));
        finalSpec = finalSpec.and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), reservationStatus));

        return findAll(finalSpec, pageable);
    };
}
