package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("api/user")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_ADMIN')")
    public ResponseEntity<List<User>> listUsers() {
        var users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @GetMapping("authority")
    @PreAuthorize("hasAnyAuthority('SCOPE_ADMIN', 'SCOPE_BASIC')")
    public ResponseEntity<String> test(JwtAuthenticationToken token) {
        Optional<User> optionalUser = userRepository.findById(Long.parseLong(token.getName()));

        return ResponseEntity.ok(optionalUser.get().getName());
    }

    @GetMapping("noauthority")
    public ResponseEntity<String> testNoAuthority(JwtAuthenticationToken token) {
        Optional<User> optionalUser = userRepository.findById(Long.parseLong(token.getName()));

        return ResponseEntity.ok(optionalUser.get().getName());
    }
}
