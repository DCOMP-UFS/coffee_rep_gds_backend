package br.ufs.coffee_rep_gds_backend.services.domain;

import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import br.ufs.coffee_rep_gds_backend.specifications.RoomSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
public class RoomDomainService {

    private final RoomRepository roomRepository;

    public RoomDomainService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public Room getRoomById(Long id) {
        Optional<Room> optionalRoom = this.roomRepository.findByIdAndStatus(id, Status.ACTIVE.value);
        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");
        return optionalRoom.get();
    }
}
