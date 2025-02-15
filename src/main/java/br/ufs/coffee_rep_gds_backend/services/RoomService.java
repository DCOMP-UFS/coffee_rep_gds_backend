package br.ufs.coffee_rep_gds_backend.services;

import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import br.ufs.coffee_rep_gds_backend.specifications.RoomSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public Page<RoomResponseDto> getAllActiveRooms(String name, String type, String section, Pageable pageable) {
        Specification<Room> spec = RoomSpecification.filter(name, type, section);
        Page<Room> allActive = this.roomRepository.findAllByStatus(Status.ACTIVE.value, spec, pageable);

        var all = allActive.stream().map(rooms -> new RoomResponseDto(
                rooms.getName(),
                rooms.getType().getName(),
                rooms.getSection().getName())).toList();
        return new PageImpl<>(all, pageable, allActive.getTotalElements());
    }

    public RoomResponseDto getRoomById(Long id) {
        Optional<Room> optionalRoom = this.roomRepository.findByIdAndStatus(id, Status.ACTIVE.value);
        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");
        return new RoomResponseDto(optionalRoom.get().getName(), optionalRoom.get().getType().getName(), optionalRoom.get().getSection().getName());
    }

    public Page<RoomResponseDto> getRoomsBySectionId(Long sectionId, String name, String type, Pageable pageable) {
        Specification<Room> spec = RoomSpecification.filter(name, type, null);
        Page<Room> allBySectionId = this.roomRepository.findBySectionId(sectionId, Status.ACTIVE.value, spec, pageable);
        var all = allBySectionId.stream().map(rooms ->
                new RoomResponseDto(rooms.getName(),
                        rooms.getType().getName(),
                        rooms.getSection().getName()
                )).toList();
        return new PageImpl<>(all, pageable, allBySectionId.getTotalElements());
    }
}
