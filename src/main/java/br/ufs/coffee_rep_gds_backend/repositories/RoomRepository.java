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

    /** Reserva “vale” como ocupação apenas se o profissional não estiver em ausência nesta data (HU Sergipe). */
    String NO_VACATION = "NOT EXISTS (SELECT 1 FROM tb_requester_absence ra WHERE ra.requester_id = tr.requester_id AND (CURRENT_TIMESTAMP AT TIME ZONE 'America/Maceio')::date BETWEEN ra.start_date AND ra.end_date)";

    String EFFECTIVE_OCCUPIED = "(tr.id IS NOT NULL AND " + NO_VACATION + ")";

    String OCUPATION_CASE = "CASE WHEN " + EFFECTIVE_OCCUPIED + " THEN true ELSE false END";

    String FILTER_OCUPATION = "(:ocupationStatus IS NULL OR " +
            "(:ocupationStatus = true AND " + EFFECTIVE_OCCUPIED + ") OR " +
            "(:ocupationStatus = false AND NOT (" + EFFECTIVE_OCCUPIED + ")))";

    String query = "SELECT DISTINCT r.id, r.name, ts.name AS section, r.section_id AS sectionId, " + OCUPATION_CASE + " AS ocupationStatus, GREATEST(r.created_at, COALESCE(r.updated_at, r.created_at)) AS max_date " +
            "FROM tb_rooms r " +
            "LEFT JOIN tb_reservations tr ON r.id = tr.room_id " +
            "AND NOW() >= tr.start_date AND NOW() <= tr.end_date AND tr.status = 1 " +
            "JOIN tb_sections ts ON r.section_id = ts.id " +
            "WHERE r.status = :status " +
            "AND (r.name LIKE CONCAT('%', :name, '%') OR :name IS NULL) " +
            "AND (ts.name LIKE CONCAT('%', :section, '%') OR :section IS NULL) " +
            "AND " + FILTER_OCUPATION + " " +
            "ORDER BY max_date DESC";

    String querySection = "SELECT DISTINCT r.id, r.name, ts.name AS section, r.section_id AS sectionId, " + OCUPATION_CASE + " AS ocupationStatus, GREATEST(r.created_at, COALESCE(r.updated_at, r.created_at)) AS max_date " +
            "FROM tb_rooms r " +
            "LEFT JOIN tb_reservations tr ON r.id = tr.room_id " +
            "AND NOW() >= tr.start_date AND NOW() <= tr.end_date AND tr.status = 1 " +
            "JOIN tb_sections ts ON r.section_id = ts.id " +
            "WHERE r.status = :status " +
            "AND ts.id = :sectionId " +
            "AND (r.name LIKE CONCAT('%', :name, '%') OR :name IS NULL) " +
            "AND " + FILTER_OCUPATION + " " +
            "ORDER BY max_date DESC";

    @Query(nativeQuery = true, value = "SELECT r.id AS id, r.name AS name, ts.name AS section, ts.id AS sectionId, " + OCUPATION_CASE + " AS ocupationStatus " +
            "FROM tb_rooms r " +
            "LEFT JOIN tb_reservations tr ON r.id = tr.room_id " +
            "AND NOW() >= tr.start_date AND NOW() <= tr.end_date AND tr.status = 1 " +
            "JOIN tb_sections ts ON r.section_id = ts.id " +
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
