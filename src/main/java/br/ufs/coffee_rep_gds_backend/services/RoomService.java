package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.RoomNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public List<RoomResponseDto> getAllActiveRooms() {
        List<Room> allActive = this.roomRepository.findAllByStatus(Status.ACTIVE);
        return allActive.stream().map(room -> {return new RoomResponseDto(
                room.getName(),
                room.getType().toString(),
                room.getSection().getName());
        }).toList();
    }

    public String getRoomById(Long id) {
        throw new RuntimeException("Not implemented yet");
    }
}
