package br.ufs.coffee_rep_gds_backend.services.application;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRoomDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRoomResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.entities.RoomType;
import br.ufs.coffee_rep_gds_backend.entities.Section;
import br.ufs.coffee_rep_gds_backend.entities.User;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import br.ufs.coffee_rep_gds_backend.exceptions.EntityNotFoundException;
import br.ufs.coffee_rep_gds_backend.projections.RoomProjection;
import br.ufs.coffee_rep_gds_backend.repositories.RoomRepository;
import br.ufs.coffee_rep_gds_backend.services.domain.RoomDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.SectionDomainService;
import br.ufs.coffee_rep_gds_backend.services.domain.UserDomainService;
import br.ufs.coffee_rep_gds_backend.utils.CurrentUserUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomDomainService roomDomainService;
    private final SectionDomainService sectionDomainService;
    private final UserDomainService userDomainService;

    public RoomService(RoomRepository roomRepository, RoomDomainService roomDomainService, SectionDomainService sectionDomainService, UserDomainService userDomainService) {
        this.roomRepository = roomRepository;
        this.roomDomainService = roomDomainService;
        this.sectionDomainService = sectionDomainService;
        this.userDomainService = userDomainService;
    }

    public Page<RoomResponseDto> getAllActiveRooms(String name, String type, String section, Pageable pageable) {
        Page<RoomProjection> roomWithOccupation = roomRepository.findRoomWithOccupation(Status.ACTIVE.value, name, type, section, pageable);
        return getRoomResponseDTOs(pageable, roomWithOccupation);
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
        return getRoomResponseDTOs(pageable, allBySectionId);
    }

    private Page<RoomResponseDto> getRoomResponseDTOs(Pageable pageable, Page<RoomProjection> allBySectionId) {
        List<RoomResponseDto> list = allBySectionId.stream().map(roomProjection -> new RoomResponseDto(
                roomProjection.getId(),
                roomProjection.getName(),
                roomProjection.getType(),
                roomProjection.getSection(),
                roomProjection.getOcupationStatus()
        )).toList();
        return new PageImpl<>(list, pageable, allBySectionId.getTotalElements());
    }

    @Transactional
    public CreateRoomResponseDTO create(CreateRoomDTO dto) {
        RoomType roomType = roomDomainService.createRoomType(dto.tipo());
        Section section = sectionDomainService.findByIdAndStatus(dto.setorId(), Status.ACTIVE.value);

        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());
        Optional<Room> optionalRoom = roomDomainService.getRoomByNameAndSection(dto.nome(), section);

        if (optionalRoom.isPresent()) {
            Room room = optionalRoom.get();
            if (room.getStatus().equals(Status.INACTIVE.value)) {
                room.setStatus(Status.ACTIVE.value);
                room.setUpdatedAt(LocalDateTime.now());
                room = roomRepository.save(room);
            }
            return new CreateRoomResponseDTO(
                    room.getId(),
                    room.getName(),
                    room.getSection().getName(),
                    room.getType().getName()
            );
        }

        Room room = new Room(dto.nome(), Status.ACTIVE.value, user, roomType, section);
        Room saved = roomRepository.save(room);
        return new CreateRoomResponseDTO(
                saved.getId(),
                saved.getName(),
                saved.getSection().getName(),
                saved.getType().getName()
        );
    }

    @Transactional
    public CreateRoomResponseDTO update(Long id, CreateRoomDTO dto) {
        Optional<Room> optionalRoom = this.roomRepository.findByIdAndStatus(id, Status.ACTIVE.value);

        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");

        Room roomToSave = optionalRoom.get();

        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        RoomType roomType = roomToSave.getType();
        if (!roomToSave.getType().getName().equals(dto.tipo())) roomType = roomDomainService.createRoomType(dto.tipo());

        Section section = roomToSave.getSection();
        if (!dto.setorId().equals(roomToSave.getSection().getId())) section = sectionDomainService.findByIdAndStatus(dto.setorId(), Status.ACTIVE.value);

        if (dto.nome() != null && !dto.nome().trim().isEmpty()) roomToSave.setName(dto.nome());
        roomToSave.setSection(section);
        roomToSave.setType(roomType);
        roomToSave.setUpdatedAt(LocalDateTime.now());
        roomToSave.setUpdatedBy(user);
        Room saved = roomRepository.save(roomToSave);

        return new CreateRoomResponseDTO(
                saved.getId(),
                saved.getName(),
                saved.getSection().getName(),
                saved.getType().getName()
        );
    }

    @Transactional
    public void delete(Long id) {
        Optional<Room> optionalRoom = this.roomRepository.findByIdAndStatus(id, Status.ACTIVE.value);

        if (optionalRoom.isEmpty()) throw new EntityNotFoundException("Sala não encontrada!");

        Room room = optionalRoom.get();
        User user = userDomainService.findByID(CurrentUserUtils.getCurrentUserID());

        room.setStatus(Status.INACTIVE.value);
        room.setUpdatedAt(LocalDateTime.now());
        room.setUpdatedBy(user);

        roomRepository.save(room);
    }
}
