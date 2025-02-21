package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Reservation;
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

import java.time.LocalDateTime;
import java.util.List;
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

        return getRoomResponseDtos(pageable, allActive);
    }

    public RoomResponseDto getRoomById(Long id) {
        Optional<Room> optionalRoom = this.roomRepository.findByIdAndStatus(id, Status.ACTIVE.value);
        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");

        Room room = optionalRoom.get();
        LocalDateTime now = LocalDateTime.now();
        Boolean isBusy = checkBusyRoom(room.getReservations(), now);
        return new RoomResponseDto(
                room.getId(),
                room.getName(),
                room.getType().getName(),
                room.getSection().getName(),
                isBusy ? "Ocupada" : "Livre"
        );
    }

    public Page<RoomResponseDto> getRoomsBySectionId(Long sectionId, String name, String type, Pageable pageable) {
        Specification<Room> spec = RoomSpecification.filter(name, type, null);
        Page<Room> allBySectionId = this.roomRepository.findBySectionId(sectionId, Status.ACTIVE.value, spec, pageable);

        return getRoomResponseDtos(pageable, allBySectionId);
    }

    private Page<RoomResponseDto> getRoomResponseDtos(Pageable pageable, Page<Room> allBySectionId) {
        var all = allBySectionId.stream().map(rooms -> {
            LocalDateTime now = LocalDateTime.now();
            Boolean isBusy = checkBusyRoom(rooms.getReservations(), now);

            return new RoomResponseDto(
                    rooms.getId(),
                    rooms.getName(),
                    rooms.getType().getName(),
                    rooms.getSection().getName(),
                    isBusy ? "Ocupada" : "Livre"
            );
        }).toList();
        return new PageImpl<>(all, pageable, allBySectionId.getTotalElements());
    }

    private Boolean checkBusyRoom(List<Reservation> reservations, LocalDateTime now) {
        boolean isBusy = false;
        for (Reservation reservation : reservations) {
            if ((now.isEqual(reservation.getStartDate()) ||
                 now.isEqual(reservation.getEndDate())) ||
                (now.isAfter(reservation.getStartDate()) && now.isBefore(reservation.getEndDate()))) isBusy = true;
        }
        return isBusy;
    }
}
