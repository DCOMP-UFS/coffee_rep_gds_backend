package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Reservation;
import br.ufs.coffee_rep_gds_backend.enums.ReservationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;


public interface ReservationRepository extends JpaRepository<Reservation, Long>, JpaSpecificationExecutor<Reservation> {

    default Page<Reservation> findAllByStartEndDate(Integer reservationStatus, Specification<Reservation> spec, Pageable pageable) {
        Specification<Reservation> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), reservationStatus));

        return findAll(finalSpec, pageable);
    }

    default List<Reservation> findAllByStartDateAndEndDateAndRoom_Id(Integer reservationStatus, Specification<Reservation> spec){
        Specification<Reservation> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), reservationStatus));

        return findAll(finalSpec);
    }

    default List<Reservation> findAllReservationsInCurrentMonth(Specification<Reservation> spec) {
        Specification<Reservation> finalSpec = Specification.where(spec);
        Integer reservationStatus = ReservationStatus.APPROVED.label;

        finalSpec = finalSpec.and((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), reservationStatus));

        return findAll(finalSpec);
    }

    Optional<Reservation> findByIdAndStatus(Long id, Integer reservationStatus);

    @Query(nativeQuery = true, value = "SELECT recurrence_id FROM tb_reservations where recurrence_id is not NULL ORDER BY recurrence_id DESC LIMIT 1;")
    Optional<Long> findLastRecurrenceId();

    @Query(nativeQuery = true, value = "SELECT id FROM tb_reservations WHERE recurrence_id = :recurrenceId AND status = :status LIMIT 1")
    Optional<Long> findOneRecurrenceId(Long recurrenceId, Integer status);

    @Transactional
    @Modifying
    @Query(nativeQuery = true, value = "UPDATE tb_reservations SET status = :status WHERE recurrence_id = :recurrenceId AND status = 1")
    void updateStatusByRecurrenceId(Long recurrenceId, Integer status);
}
