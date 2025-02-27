package br.ufs.coffee_rep_gds_backend.projections;

public interface RoomProjection {
    Long getId();
    String getName();
    String getType();
    String getSection();
    Boolean getOcupationStatus();
}
