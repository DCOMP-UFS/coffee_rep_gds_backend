package br.ufs.coffee_rep_gds_backend.projections;

import br.ufs.coffee_rep_gds_backend.entities.RoomType;
import br.ufs.coffee_rep_gds_backend.entities.Section;

//TODO Try to use the real RoomTyp and RoomSection class in this projection
public interface RoomProjection {
    Long getId();
    String getName();
    String getType();
    String getSection();
//    Integer getStatus();
//    RoomType getType();
//    Section getSection();
    Boolean getOcupationStatus();
}
