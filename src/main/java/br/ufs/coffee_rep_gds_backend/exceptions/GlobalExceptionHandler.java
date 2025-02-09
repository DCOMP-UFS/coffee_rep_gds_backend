package br.ufs.coffee_rep_gds_backend.exceptions;

import br.ufs.coffee_rep_gds_backend.dtos.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RoomNotFoundException.class)
    public ResponseEntity<ErrorResponse> roomNotFoundExceptionHandler(RoomNotFoundException exception, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(400, "Bad Request", exception.getMessage(), request.getRequestURI());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> exceptionHandler(Exception exception, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(500, "Internal Server Error", "Algum erro desconhecido ocorreu!", request.getRequestURI());
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error);
    }
}
