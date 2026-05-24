package br.ufs.coffee_rep_gds_backend.repositories;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface RequesterRepository extends JpaRepository<Requester, Long>, JpaSpecificationExecutor<Requester> {

    default Page<Requester> findAllByStatus(Integer status, Specification<Requester> spec, Pageable pageable) {
        Specification<Requester> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"), status));

        return findAll(finalSpec, pageable);
    }

    default List<Requester> findAllByStatusUnpaged(Integer status, Specification<Requester> spec) {
        Specification<Requester> finalSpec = Specification.where(spec);

        finalSpec = finalSpec.and((root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"), status));

        return findAll(finalSpec);
    }

    default Page<Requester> findAllByRequesterTypeId(Long requesterTypeId, Specification<Requester> spec, Pageable pageable) {
        Specification<Requester> finalSpec = Specification.where(spec);

        if (requesterTypeId != null) {
            finalSpec = finalSpec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("requesterType").get("id"), requesterTypeId));
            finalSpec = finalSpec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), 1));
        }

        return findAll(finalSpec, pageable);
    }
}
