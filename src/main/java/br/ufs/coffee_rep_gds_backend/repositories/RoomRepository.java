package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;


public interface RoomRepository extends JpaRepository<Room, Long>, JpaSpecificationExecutor<Room> {

    default Page<Room> findAllByStatus(Integer status, Specification<Room> spec, Pageable pageable) {
        Specification<Room> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"), 1));

        return findAll(finalSpec, pageable);
    }

    Optional<Room> findByIdAndStatus(Long id, Integer status);

    default Page<Room> findBySectionId(Long sectionId, Integer status, Specification<Room> spec, Pageable pageable) {
        Specification<Room> finalSpec = Specification.where(spec);

        if (sectionId != null) {
            finalSpec = finalSpec.and(((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("section").get("id"), sectionId)));
        }

        finalSpec = finalSpec.and(((root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"), 1)));

        return findAll(finalSpec, pageable);
    }
}
