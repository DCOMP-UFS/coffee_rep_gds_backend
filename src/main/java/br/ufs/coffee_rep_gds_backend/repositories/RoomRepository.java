package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.projections.RoomProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;


public interface RoomRepository extends JpaRepository<Room, Long> {

    String query = "SELECT distinct r.id, r.name, ts.name as section, r.section_id as sectionId, case when tr.id is not null then true else false end as ocupationStatus, GREATEST(r.created_at, COALESCE(r.updated_at, r.created_at)) AS max_date " +
                   "FROM tb_rooms r " +
                   "left join tb_reservations tr on r.id = tr.room_id " +
                   "and now() >= tr.start_date and now() <= tr.end_date  and tr.status = 1 " +
                   "join tb_sections ts on r.section_id = ts.id " +
                   "where r.status = :status " +
                   "and (r.name like concat('%', :name, '%') or :name is null) " +
                   "and (ts.name like concat('%', :section, '%') or :section is null) " +
                   "and (:ocupationStatus is null or " +
                   "(:ocupationStatus = true and tr.id is not null) or " +
                   "(:ocupationStatus = false AND tr.id IS NULL)) " +
                   "order by max_date desc";

    String querySection = "SELECT distinct r.id, r.name, ts.name as section, r.section_id as sectionId, case when tr.id is not null then true else false end as ocupationStatus, GREATEST(r.created_at, COALESCE(r.updated_at, r.created_at)) AS max_date " +
                          "FROM tb_rooms r " +
                          "left join tb_reservations tr on r.id = tr.room_id " +
                          "and now() >= tr.start_date and now() <= tr.end_date and tr.status = 1 " +
                          "join tb_sections ts on r.section_id = ts.id " +
                          "where r.status = :status " +
                          "and ts.id = :sectionId " +
                          "and (r.name like concat('%', :name, '%') or :name is null) " +
                          "and (:ocupationStatus is null or " +
                          "(:ocupationStatus = true and tr.id is not null) or " +
                          "(:ocupationStatus = false AND tr.id IS NULL)) " +
                          "order by max_date desc";

    @Query(nativeQuery = true, value = "SELECT r.id as id, r.name as name, ts.name as section, ts.id as sectionId, case when tr.id is not null then true else false end as ocupationStatus " +
                                       "FROM tb_rooms r " +
                                       "LEFT JOIN tb_reservations tr ON r.id = tr.room_id " +
                                       "AND now() >= tr.start_date AND now() <= tr.end_date AND tr.status = 1 " +
                                       "JOIN tb_sections ts on r.section_id = ts.id " +
                                       "WHERE r.id = :id AND r.status = :status")
    Optional<RoomProjection> findActive(Long id, Integer status);

    Optional<Room> findByIdAndStatus(Long id, Integer status);

    @Query(nativeQuery = true, value = querySection)
    Page<RoomProjection> findBySectionId(Long sectionId, Integer status, String name, Boolean ocupationStatus, Pageable pageable);

    @Query(nativeQuery = true, value = querySection)
    List<RoomProjection> findBySectionIdUnpaged(Long sectionId, Integer status, String name, Boolean ocupationStatus);

    @Query(nativeQuery = true, value = query)
    Page<RoomProjection> findRoomWithOccupation(Integer status, String name, String section, Boolean ocupationStatus, Pageable pageable);

    Optional<Room> getRoomByNameIgnoreCaseAndSection(String name, Section section);

    @Query(nativeQuery = true, value = query)
    List<RoomProjection> findAllActiveRoomUnpaged(Integer status, String name, String section, Boolean ocupationStatus);
}
