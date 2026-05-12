package br.ufs.coffee_rep_gds_backend.repositories;


import br.ufs.coffee_rep_gds_backend.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByCpf(String cpf);

    Optional<User> findByEmail(String email);

}
