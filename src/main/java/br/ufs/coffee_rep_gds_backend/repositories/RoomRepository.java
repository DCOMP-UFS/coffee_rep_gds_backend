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

    String query = "SELECT distinct r.id, r.name, tt.name as type, ts.name as section, case when tr.id is not null then true else false end as ocupationStatus " +
                   "FROM tb_rooms r " +
                   "left join tb_reservations tr on r.id = tr.room_id " +
                   "and now() >= tr.start_date and now() <= tr.end_date  and tr.status = 1 " +
                   "left join tb_sections ts on r.section_id = ts.id " +
                   "left join tb_room_types tt on r.room_type_id = tt.id " +
                   "where r.status = :status " +
                   "and (r.name like concat('%', :name, '%') or :name is null) " +
                   "and (tt.name like concat('%', :type, '%') or :type is null) " +
                   "and (ts.name like concat('%', :section, '%') or :section is null) " +
                   "and (:ocupationStatus is null or " +
                   "(:ocupationStatus = true and tr.id is not null) or " +
                   "(:ocupationStatus = false AND tr.id IS NULL))";

    @Query(nativeQuery = true, value = query)
    Optional<RoomProjection> findActive(Long id, Integer status, String name, String type, Boolean ocupationStatus, String section);

    Optional<Room> findByIdAndStatus(Long id, Integer status);

    @Query(nativeQuery = true, value = "SELECT distinct r.id, r.name, tt.name as type, ts.name as section, case when tr.id is not null then true else false end as ocupationStatus " +
                                       "FROM tb_rooms r " +
                                       "left join tb_reservations tr on r.id = tr.room_id " +
                                       "and now() >= tr.start_date and now() <= tr.end_date and tr.status = 1 " +
                                       "left join tb_sections ts on r.section_id = ts.id " +
                                       "left join tb_room_types tt on r.room_type_id = tt.id " +
                                       "where r.status = :status " +
                                       "and ts.id = :sectionId " +
                                       "and (r.name like concat('%', :name, '%') or :name is null) " +
                                       "and (tt.name like concat('%', :type, '%') or :type is null) " +
                                       "and (:ocupationStatus is null or " +
                                       "(:ocupationStatus = true and tr.id is not null) or " +
                                       "(:ocupationStatus = false AND tr.id IS NULL))")
    Page<RoomProjection> findBySectionId(Long sectionId, Integer status, String name, String type, Boolean ocupationStatus, Pageable pageable);

    @Query(nativeQuery = true, value = query)
    Page<RoomProjection> findRoomWithOccupation(Integer status, String name, String type, String section, Boolean ocupationStatus, Pageable pageable);

    Optional<Room> getRoomByNameIgnoreCaseAndSection(String name, Section section);

    @Query(nativeQuery = true, value = query)
    List<RoomProjection> findAllActiveRoomUnpaged(Integer status, String name, String type, String section, Boolean ocupationStatus);
}
