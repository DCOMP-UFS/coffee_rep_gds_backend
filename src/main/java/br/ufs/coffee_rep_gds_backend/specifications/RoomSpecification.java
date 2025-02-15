package br.ufs.coffee_rep_gds_backend.specifications;

import br.ufs.coffee_rep_gds_backend.entities.Room;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class RoomSpecification {

    public static Specification<Room> filter(String name, String type, String section) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (name != null && !name.isEmpty()) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
            }

            if (type != null && !type.isEmpty()) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("type").get("name")), "%" + type.toLowerCase() + "%"));
            }

            if (section != null && !section.isEmpty()) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("section").get("name")), "%" + section.toLowerCase() + "%"));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
