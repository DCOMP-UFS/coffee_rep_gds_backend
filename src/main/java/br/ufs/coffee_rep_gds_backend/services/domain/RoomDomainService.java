package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.RoomType;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import br.ufs.coffee_rep_gds_backend.repositories.RoomTypeRepository;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;


@Service
public class RoomDomainService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final UserDomainService userDomainService;

    public RoomDomainService(RoomRepository roomRepository, RoomTypeRepository roomTypeRepository, UserDomainService userDomainService) {
        this.roomRepository = roomRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.userDomainService = userDomainService;
    }

    public Room getRoomById(Long id) {
        Optional<Room> optionalRoom = this.roomRepository.findByIdAndStatus(id, Status.ACTIVE.value);
        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");
        return optionalRoom.get();
    }

    public Optional<Room> getRoomByNameAndSection(String name, Section section) {
        return roomRepository.getRoomByNameIgnoreCaseAndSection(name, section);
    }

    public RoomType createRoomType(String name) {
        Optional<RoomType> optionalRoomType = this.roomTypeRepository.findByNameIgnoreCase(name);
        
        if (optionalRoomType.isPresent()) {
            return optionalRoomType.get();
        }

        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());
        RoomType roomType = new RoomType(name, Status.ACTIVE.value, user);
        roomType.setUpdatedAt(LocalDateTime.now());

        return roomTypeRepository.save(roomType);
    }

}
