package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public Page<RoomResponseDto> getAllActiveRooms(Pageable pageable) {
        Page<Room> allActive = this.roomRepository.findAllByStatus(Status.ACTIVE.value, pageable);
        var all = allActive.stream().map(rooms -> {return new RoomResponseDto(
                rooms.getName(),
                rooms.getType().getName(),
                rooms.getSection().getName());
        }).toList();
        return new PageImpl<>(all, pageable, allActive.getTotalElements());
    }

    public RoomResponseDto getRoomById(Long id) {
        Optional<Room> optionalRoom = this.roomRepository.findById(id);
        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");
        return new RoomResponseDto(optionalRoom.get().getName(), optionalRoom.get().getType().getName(), optionalRoom.get().getSection().getName());
    }

    public Page<RoomResponseDto> getRoomsBySectionId(Long sectionId, Pageable pageable) {
        Page<Room> allBySectionId = this.roomRepository.findBySectionId(sectionId, Status.ACTIVE.value, pageable);
        var all = allBySectionId.stream().map(rooms -> {return new RoomResponseDto(rooms.getName(), rooms.getType().getName(), rooms.getSection().getName());}).toList();
        return new PageImpl<>(all, pageable, allBySectionId.getTotalElements());
    }
}
