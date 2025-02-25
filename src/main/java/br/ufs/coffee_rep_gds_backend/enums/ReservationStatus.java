package br.ufs.coffee_rep_gds_backend.enums;

public enum ReservationStatus {
    APPROVED(1),
    CANCELLED(2);

    public final Integer label;

    ReservationStatus(Integer label) {
        this.label = label;
    }
}
