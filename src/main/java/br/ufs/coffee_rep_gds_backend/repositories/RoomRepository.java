package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;


public interface RoomRepository extends JpaRepository<Room, Long> {

    Page<Room> findAllByStatus(Status status, Pageable pageable);

    @Query(nativeQuery = true, value = "SELECT * FROM tb_rooms WHERE section_id = :sectionId AND status = :status")
    Page<Room> findBySectionId(Long sectionId, String status, Pageable pageable);
}
