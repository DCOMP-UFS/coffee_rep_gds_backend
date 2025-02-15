package br.ufs.coffee_rep_gds_backend.exceptions;

public class EntityNotFoundException extends RuntimeException{

    public EntityNotFoundException(String message) {
        super(message);
    }
}
