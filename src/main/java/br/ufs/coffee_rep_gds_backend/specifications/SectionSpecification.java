package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Section;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class SectionSpecification {

    @SuppressWarnings("DuplicatedCode")
    public static Specification<Section> filter(String name) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (name != null && !name.isEmpty()) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")),"%" + name.toLowerCase() + "%"));
            }

            query.orderBy(criteriaBuilder.desc(root.get("id")));

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
