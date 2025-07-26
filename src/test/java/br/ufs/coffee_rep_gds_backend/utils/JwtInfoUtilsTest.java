package br.ufs.coffee_rep_gds_backend.utils;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class JwtInfoUtilsTest {

    @Mock
    private SecurityContext securityContext;
    @Mock private Authentication authentication;

    @Test
    void shouldReturnUsernameWhenPrincipalIsUserDetails() {
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.getUsername()).thenReturn("username");

        try (MockedStatic<SecurityContextHolder> mocked = Mockito.mockStatic(SecurityContextHolder.class)) {
            mocked.when(SecurityContextHolder::getContext).thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getPrincipal()).thenReturn(userDetails);

            String result = JwtInfoUtils.getUsernameFromSecurityContext();

            assertEquals("username", result);
        }
    }

    @Test
    void shouldReturnSubjectWhenPrincipalIsJwt() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("123");

        try (MockedStatic<SecurityContextHolder> mocked = Mockito.mockStatic(SecurityContextHolder.class)) {
            mocked.when(SecurityContextHolder::getContext).thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getPrincipal()).thenReturn(jwt);

            String result = JwtInfoUtils.getUsernameFromSecurityContext();

            assertEquals("123", result);
        }
    }

    @Test
    void shouldReturnNullWhenPrincipalIsUnknown() {
        try (MockedStatic<SecurityContextHolder> mocked = Mockito.mockStatic(SecurityContextHolder.class)) {
            mocked.when(SecurityContextHolder::getContext).thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getPrincipal()).thenReturn("anonymous");

            String result = JwtInfoUtils.getUsernameFromSecurityContext();

            assertNull(result);
        }
    }

    @Test
    void shouldReturnClaimValueWhenPrincipalIsJwt() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getClaimAsString("role")).thenReturn("ADMIN");

        try (MockedStatic<SecurityContextHolder> mocked = Mockito.mockStatic(SecurityContextHolder.class)) {
            mocked.when(SecurityContextHolder::getContext).thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getPrincipal()).thenReturn(jwt);

            String result = JwtInfoUtils.getClaim("role");

            assertEquals("ADMIN", result);
        }
    }

    @Test
    void shouldReturnNullWhenPrincipalIsNotJwt() {
        try (MockedStatic<SecurityContextHolder> mocked = Mockito.mockStatic(SecurityContextHolder.class)) {
            mocked.when(SecurityContextHolder::getContext).thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getPrincipal()).thenReturn("anonymous");

            String result = JwtInfoUtils.getClaim("role");

            assertNull(result);
        }
    }
}
