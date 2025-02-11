package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;


@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public Page<RoomResponseDto> getAllActiveRooms(Pageable pageable) {
        Page<Room> allActive = this.roomRepository.findAllByStatus(Status.ACTIVE, pageable);
        var all = allActive.stream().map(rooms -> {return new RoomResponseDto(rooms.getName(), rooms.getType().label, rooms.getSection().getName());}).toList();
        return new PageImpl<>(all, pageable, allActive.getTotalElements());
    }

    public String getRoomById(Long id) {
        throw new RuntimeException("Not implemented yet");
    }

    public Page<RoomResponseDto> getRoomsBySectionId(Long sectionId, Pageable pageable) {
        Page<Room> allBySectionId = this.roomRepository.findBySectionId(sectionId, Status.ACTIVE.toString(), pageable);
        var all = allBySectionId.stream().map(rooms -> {return new RoomResponseDto(rooms.getName(), rooms.getType().label, rooms.getSection().getName());}).toList();
        return new PageImpl<>(all, pageable, allBySectionId.getTotalElements());
    }
}
