package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.RequesterAbsence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RequesterAbsenceRepository extends JpaRepository<RequesterAbsence, Long> {

    @Query("""
            SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END
            FROM RequesterAbsence a
            WHERE a.requester.id = :requesterId
            AND :date BETWEEN a.startDate AND a.endDate
            """)
    boolean existsForRequesterOnDate(@Param("requesterId") Long requesterId, @Param("date") LocalDate date);

    List<RequesterAbsence> findAllByRequester_IdOrderByStartDateDesc(Long requesterId);
}
