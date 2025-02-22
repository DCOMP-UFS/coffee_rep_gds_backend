package br.ufs.coffee_rep_gds_backend.config;

import br.ufs.coffee_rep_gds_backend.entities.Role;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.repositories.RoleRepository;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Set;

@Configuration
public class AdminUserConfig implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    @Value("${admin-cpf}")
    private String adminCpf;

    @Value("${admin-password}")
    private String adminPassword;

    public AdminUserConfig(RoleRepository roleRepository, UserRepository userRepository, BCryptPasswordEncoder bCryptPasswordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        var roleAdmin = roleRepository.findByName(Role.Values.ADMIN.name());

        if (roleAdmin.isEmpty()) {
            throw new RuntimeException("There is no admin role");
        }

        var userAdmin = userRepository.findByCpf(adminCpf);

        userAdmin.ifPresentOrElse(
                (user) -> {
                    System.out.println("Admin user already exists");
                },
                () -> {
                    var user = new User();
                    user.setName("Admin");
                    user.setPassword(bCryptPasswordEncoder.encode(adminPassword));
                    user.setEmail("admin@admin.com");
                    user.setCpf(adminCpf);
                    try {
                        user.setBirthDate(new SimpleDateFormat("yyyy-MM-dd").parse("1995-01-01"));
                    } catch (ParseException e) {
                        throw new RuntimeException(e);
                    }
                    user.setPhone("79999999999");
                    user.setStatus(1);
                    user.setRoles(Set.of(roleAdmin.get()));

                    userRepository.save(user);
                }
        );
    }
}
