package br.ufs.coffee_rep_gds_backend.exceptions;

public class RoomNotFoundException extends RuntimeException{

    public RoomNotFoundException(String message) {
        super(message);
    }
}
