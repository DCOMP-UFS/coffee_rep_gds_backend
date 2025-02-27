package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class RequesterSpecification {

    @SuppressWarnings("DuplicatedCode")
    public static Specification<Requester> all(String name, String cpf) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (name != null && !name.isEmpty()) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")),"%" + name.toLowerCase() + "%"));
            }

            if (cpf != null && !cpf.isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("cpf"), cpf));
            }

            query.orderBy(criteriaBuilder.desc(root.get("id")));

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
