package br.ufs.coffee_rep_gds_backend.utils;

public class CurrentUserUtils {

    public static Long getCurrentUserID() {
        String userId = JwtInfoUtils.getUsernameFromSecurityContext();
        return convertId(userId);
    }

    private static Long convertId(String id) {
        if (id == null || id.isEmpty()) {
            throw new RuntimeException("ID não pode ser nulo");
        }

        try {
            return Long.parseLong(id);
        } catch (NumberFormatException e) {
            throw new RuntimeException("O formato do ID é inválido!");
        }
    }
}
