package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.CreateUserDto;
import br.ufs.coffee_rep_gds_backend.dtos.LoginRequest;
import br.ufs.coffee_rep_gds_backend.dtos.LoginResponse;
import br.ufs.coffee_rep_gds_backend.entities.Role;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Position;
import br.ufs.coffee_rep_gds_backend.repositories.RoleRepository;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.apache.coyote.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final JwtEncoder jwtEncoder;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${expiration-time}")
    private Long expiresIn;

    public AuthService(JwtEncoder jwtEncoder, UserRepository userRepository, RoleRepository roleRepository, BCryptPasswordEncoder passwordEncoder) {
        this.jwtEncoder = jwtEncoder;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResponse authenticate(LoginRequest loginRequest) {
        var user = userRepository.findByUsername(loginRequest.username());

        if (user.isEmpty() || !user.get().isLoginCorrect(loginRequest, passwordEncoder)) {
            throw new BadCredentialsException("Invalid username or password");
        }

        var now = Instant.now();

        var scopes = user.get().getRoles()
                .stream()
                .map(Role::getName)
                .collect(Collectors.joining(" "));

        var claims = JwtClaimsSet.builder()
                .issuer("GDS_backend")
                .subject(user.get().getUserId().toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(expiresIn))
                .claim("scope", scopes)
                .build();

        var jwtValue = jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();

        return new LoginResponse(jwtValue, expiresIn);
    }

    @Transactional
    public void register(CreateUserDto dto) throws BadRequestException {
        Optional<Role> roleOptional = roleRepository.findByName(Role.Values.BASIC.name());

        if (roleOptional.isEmpty()) {
            throw new RuntimeException("Role not found");
        }

        Optional<User> userOptional = userRepository.findByUsername(dto.username());

        if (userOptional.isPresent()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY);
        }

        Date birthDate;

        try {
            birthDate = new SimpleDateFormat("yyyy-MM-dd").parse(dto.birthDate());
        } catch (ParseException e) {
            throw new BadRequestException("O formato da data de aniversário deve ser [yyyy-MM-dd] ");
        }

        var user = new User();
        user.setUsername(dto.username());
        user.setPassword(passwordEncoder.encode(dto.password()));
        user.setCpf(dto.cpf());
        user.setEmail(dto.email());
        user.setBirthDate(birthDate);
        user.setPosition(Position.valueOf(dto.position()));
        user.setRoles(Set.of(roleOptional.get()));

        userRepository.save(user);
    }
}
