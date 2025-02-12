package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateUserDto;
import br.ufs.coffee_rep_gds_backend.dtos.request.LoginRequest;
import br.ufs.coffee_rep_gds_backend.dtos.response.LoginResponse;
import br.ufs.coffee_rep_gds_backend.services.AuthService;
import org.apache.coyote.BadRequestException;
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
    public ResponseEntity<Void> register(@RequestBody CreateUserDto dto) throws BadRequestException {
        authService.register(dto);
        return ResponseEntity.ok().build();
    }
}
