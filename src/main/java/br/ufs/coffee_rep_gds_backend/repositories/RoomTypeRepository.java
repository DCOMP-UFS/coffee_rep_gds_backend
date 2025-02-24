package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoomTypeRepository extends JpaRepository<RoomType, Integer> {

//  TODO  @Query(value = "SELECT * FROM tb_room_types WHERE unaccent(court_name) ILIKE unaccent(:name)", nativeQuery = true)
    Optional<RoomType> findByNameIgnoreCase(String name);
}
