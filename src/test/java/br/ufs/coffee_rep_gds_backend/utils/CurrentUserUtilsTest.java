package br.ufs.coffee_rep_gds_backend.utils;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;


@ExtendWith(MockitoExtension.class)
class CurrentUserUtilsTest {

    @Test
    void shouldReturnCurrentUserIDWhenValidId() {
        try (MockedStatic<JwtInfoUtils> mockedJwt = Mockito.mockStatic(JwtInfoUtils.class)) {
            mockedJwt.when(JwtInfoUtils::getUsernameFromSecurityContext).thenReturn("123");

            Long result = CurrentUserUtils.getCurrentUserID();

            assertEquals(123L, result);
        }
    }

    @Test
    void shouldThrowExceptionWhenCurrentUserIDIsNull() {
        try (MockedStatic<JwtInfoUtils> mockedJwt = Mockito.mockStatic(JwtInfoUtils.class)) {
            mockedJwt.when(JwtInfoUtils::getUsernameFromSecurityContext).thenReturn(null);

            RuntimeException exception = assertThrows(RuntimeException.class, CurrentUserUtils::getCurrentUserID);
            assertEquals("ID não pode ser nulo", exception.getMessage());
        }
    }

    @Test
    void shouldThrowExceptionWhenCurrentUserIDIsInvalid() {
        try (MockedStatic<JwtInfoUtils> mockedJwt = Mockito.mockStatic(JwtInfoUtils.class)) {
            mockedJwt.when(JwtInfoUtils::getUsernameFromSecurityContext).thenReturn("abc");

            RuntimeException exception = assertThrows(RuntimeException.class, CurrentUserUtils::getCurrentUserID);
            assertEquals("O formato do ID é inválido!", exception.getMessage());
        }
    }
}
