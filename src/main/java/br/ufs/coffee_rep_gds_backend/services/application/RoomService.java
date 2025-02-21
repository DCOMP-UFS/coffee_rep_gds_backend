package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.projections.RoomProjection;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;


@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public Page<RoomResponseDto> getAllActiveRooms(String name, String type, String section, Pageable pageable) {
        Page<RoomProjection> roomWithOcupation = roomRepository.findRoomWithOccupation(Status.ACTIVE.value, name, type, section, pageable);
        return getRoomResponseDtos(pageable, roomWithOcupation);
    }

    public RoomResponseDto getRoomById(Long id, String name, String type, String section) {
        Optional<RoomProjection> optionalRoom = this.roomRepository.findActive(id, Status.ACTIVE.value, name, type, section);
        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");

        RoomProjection room = optionalRoom.get();
        return new RoomResponseDto(
                room.getId(),
                room.getName(),
                room.getType(),
                room.getSection(),
                room.getOcupationStatus()
        );
    }

    public Page<RoomResponseDto> getRoomsBySectionId(Long sectionId, String name, String type, Pageable pageable) {
        Page<RoomProjection> allBySectionId = this.roomRepository.findBySectionId(sectionId, Status.ACTIVE.value, name, type, pageable);
        return getRoomResponseDtos(pageable, allBySectionId);
    }

    private Page<RoomResponseDto> getRoomResponseDtos(Pageable pageable, Page<RoomProjection> allBySectionId) {
        List<RoomResponseDto> list = allBySectionId.stream().map(roomProjection -> new RoomResponseDto(
                roomProjection.getId(),
                roomProjection.getName(),
                roomProjection.getType(),
                roomProjection.getSection(),
                roomProjection.getOcupationStatus()
        )).toList();
        return new PageImpl<>(list, pageable, allBySectionId.getTotalElements());
    }
}
