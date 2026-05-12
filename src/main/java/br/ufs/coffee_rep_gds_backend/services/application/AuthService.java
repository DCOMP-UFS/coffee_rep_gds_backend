package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateUserDto;
import br.ufs.coffee_rep_gds_backend.dtos.request.LoginRequest;
import br.ufs.coffee_rep_gds_backend.dtos.response.LoginResponse;
import br.ufs.coffee_rep_gds_backend.entities.Role;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.exceptions.BadParametersException;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityAlreadyExistsException;
import br.ufs.coffee_rep_gds_backend.repositories.RoleRepository;
import br.ufs.coffee_rep_gds_backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        var user = userRepository.findByCpf(loginRequest.cpf());

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
    public void register(CreateUserDto dto) {
        Optional<Role> roleOptional = roleRepository.findByName(Role.Values.BASIC.name());

        if (roleOptional.isEmpty()) {
            throw new RuntimeException("Papel não encontrado");
        }

        Optional<User> userOptional = userRepository.findByCpf(dto.cpf());

        if (userOptional.isPresent()) {
            throw new EntityAlreadyExistsException("Este CPF já está cadastrado.");
        }

        Optional<User> emailOptional = userRepository.findByEmail(dto.email());

        if (emailOptional.isPresent()) {
            throw new EntityAlreadyExistsException("Este e-mail já está cadastrado.");
        }

        Date birthDate;

        try {
            birthDate = new SimpleDateFormat("yyyy-MM-dd").parse(dto.birthDate());
        } catch (ParseException e) {
            throw new BadParametersException("O formato da data de aniversário deve ser [yyyy-MM-dd].");
        }

        var user = new User();
        user.setName(dto.name());
        user.setPhone(dto.phone());
        user.setPassword(passwordEncoder.encode(dto.password()));
        user.setCpf(dto.cpf());
        user.setEmail(dto.email());
        user.setBirthDate(birthDate);
        user.setRoles(Set.of(roleOptional.get()));
        user.setStatus(1);

        userRepository.save(user);
    }
}
