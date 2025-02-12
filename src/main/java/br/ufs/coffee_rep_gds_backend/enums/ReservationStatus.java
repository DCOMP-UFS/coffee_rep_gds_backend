package br.ufs.coffee_rep_gds_backend.enums;

public enum ReservationStatus {
    APPROVED("Aprovada"),
    CANCELLED("Cancelada");

    public final String label;

    ReservationStatus(String label) {
        this.label = label;
    }
}
