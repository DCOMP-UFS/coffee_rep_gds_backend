package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.specifications.SectionSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface SectionRepository extends JpaRepository<Section, Long>, JpaSpecificationExecutor<Section> {

    default Page<Section> findAllByStatus(Integer status, Specification<Section> spec, Pageable pageable) {
        Specification<Section> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"), 1));

        return findAll(finalSpec, pageable);
    }

    List<Section> findAllByNameAndStatus(String name, Integer status);
}
