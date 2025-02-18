package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;


public interface ReservationRepository extends JpaRepository<Reservation, Long>, JpaSpecificationExecutor<Reservation> {

    default Page<Reservation> findAllByStartEndDate(String reservationStatus, Specification<Reservation> spec, Pageable pageable) {
        Specification<Reservation> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), reservationStatus));

        return findAll(finalSpec, pageable);
    }
}
