package br.ufs.coffee_rep_gds_backend.utils;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;

public class JwtInfoUtils {

    public static String getUsernameFromSecurityContext() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        } else if (principal instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        return null;
    }

    public static String getClaim(String claimName) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (principal instanceof Jwt jwt) {
            return jwt.getClaimAsString(claimName);
        }
        return null;
    }
}
