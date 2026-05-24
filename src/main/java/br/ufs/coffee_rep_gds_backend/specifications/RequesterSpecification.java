package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Requester;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class RequesterSpecification {

    @SuppressWarnings("DuplicatedCode")
    public static Specification<Requester> all(String busca) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (busca != null && !busca.isBlank()) {
                String term = busca.trim().toLowerCase();
                String digits = busca.replaceAll("\\D", "");

                List<Predicate> searchPredicates = new ArrayList<>();
                searchPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), "%" + term + "%"));
                searchPredicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("specialty")), "%" + term + "%"));

                if (!digits.isEmpty()) {
                    searchPredicates.add(criteriaBuilder.like(root.get("contactNumber"), "%" + digits + "%"));
                }

                predicates.add(criteriaBuilder.or(searchPredicates.toArray(new Predicate[0])));
            }

            Expression<Object> maxDate = criteriaBuilder.selectCase()
                    .when(criteriaBuilder.greaterThan(root.get("updatedAt"), root.get("createdAt")), root.get("updatedAt"))
                    .otherwise(root.get("createdAt"));

            query.orderBy(criteriaBuilder.desc(maxDate));

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
