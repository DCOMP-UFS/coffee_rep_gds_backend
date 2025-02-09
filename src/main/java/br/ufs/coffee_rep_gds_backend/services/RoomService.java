package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.exceptions.RoomNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class RoomService {

    public String getAllRooms() {
        throw new RoomNotFoundException("Not implemented yet");
    }

    public String getRoomById(Long id) {
        throw new RuntimeException("Not implemented yet");
    }
}
