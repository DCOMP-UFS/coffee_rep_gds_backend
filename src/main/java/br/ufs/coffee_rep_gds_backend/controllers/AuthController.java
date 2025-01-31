package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.CreateUserDto;
import br.ufs.coffee_rep_gds_backend.dtos.LoginRequest;
import br.ufs.coffee_rep_gds_backend.dtos.LoginResponse;
import br.ufs.coffee_rep_gds_backend.services.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest loginRequest) {
        LoginResponse response = this.authService.authenticate(loginRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@RequestBody CreateUserDto dto) {
        authService.register(dto);
        return ResponseEntity.ok().build();
    }
}
