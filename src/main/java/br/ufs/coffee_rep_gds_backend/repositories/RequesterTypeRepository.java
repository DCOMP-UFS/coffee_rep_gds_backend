package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.RequesterType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RequesterTypeRepository extends JpaRepository<RequesterType, Long> {

    Optional<RequesterType> findByNameIgnoreCaseAndPositionIgnoreCase(String name, String position);
}
