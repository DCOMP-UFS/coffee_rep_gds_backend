package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.entities.Room;
import br.ufs.coffee_rep_gds_backend.services.RoomService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/room")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public Page<RoomResponseDto> getAllRooms(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String setor,
            Pageable pageable
    ) {
        Page<Room> allActive = roomService.getAllActiveRooms(nome, tipo, setor, pageable);

        var all = allActive.stream().map(rooms -> new RoomResponseDto(
                rooms.getId(),
                rooms.getName(),
                rooms.getType().getName(),
                rooms.getSection().getName())).toList();
        return new PageImpl<>(all, pageable, allActive.getTotalElements());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponseDto> getRoomById(@PathVariable Long id) {
        Room room = roomService.getRoomById(id);
        RoomResponseDto dto = new RoomResponseDto(room.getId(), room.getName(), room.getType().getName(), room.getSection().getName());
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/section/{sectionId}")
    public Page<RoomResponseDto> getRoomsBySectionId(
            @PathVariable Long sectionId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String tipo,
            Pageable pageable
    ) {
        Page<Room> allBySectionId = roomService.getRoomsBySectionId(sectionId, nome, tipo, pageable);

        var all = allBySectionId.stream().map(rooms ->
                new RoomResponseDto(
                        rooms.getId(),
                        rooms.getName(),
                        rooms.getType().getName(),
                        rooms.getSection().getName()
                )).toList();
        return new PageImpl<>(all, pageable, allBySectionId.getTotalElements());
    }
}
