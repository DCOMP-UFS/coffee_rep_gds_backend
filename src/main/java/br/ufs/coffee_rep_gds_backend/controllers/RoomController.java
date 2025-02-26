package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.request.CreateRoomDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.CreateRoomResponseDTO;
import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.RoomService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/room")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public ResponseEntity<?> getAllRooms(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String setor,
            @RequestParam(required = false) Boolean ocupada,
            @RequestParam(required = false) Boolean unpaged,
            Pageable pageable
    ) {
        if (unpaged != null && unpaged) {
            List<RoomResponseDto> allActiveRoomsUnpaged = roomService.getAllActiveRoomsUnpaged(nome, tipo, setor, ocupada);
            return ResponseEntity.ok(allActiveRoomsUnpaged);
        }
        Page<RoomResponseDto> allActiveRooms = roomService.getAllActiveRooms(nome, tipo, setor, ocupada, pageable);
        return ResponseEntity.ok(allActiveRooms);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponseDto> getRoomById(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String setor,
            @RequestParam(required = false) Boolean ocupada,
            @PathVariable Long id
    ) {
        RoomResponseDto dto = roomService.getRoomById(id, nome, tipo, setor, ocupada);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<?> getRoomsBySectionId(
            @PathVariable Long sectionId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) Boolean ocupada,
            @RequestParam(required = false) Boolean unpaged,
            Pageable pageable
    ) {
        if (unpaged != null && unpaged) {
            List<RoomResponseDto> rooms = roomService.getRoomsBySectionIdUnpaged(sectionId, nome, tipo, ocupada);
            return ResponseEntity.ok(rooms);
        }
        Page<RoomResponseDto> roomsBySectionId = roomService.getRoomsBySectionId(sectionId, nome, tipo, ocupada, pageable);
        return ResponseEntity.ok(roomsBySectionId);
    }

    @PostMapping
    public ResponseEntity<CreateRoomResponseDTO> createRoom(@RequestBody @Valid CreateRoomDTO dto) {
        CreateRoomResponseDTO createRoomResponseDTO = roomService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createRoomResponseDTO);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CreateRoomResponseDTO> updateRoom(@PathVariable Long id, @RequestBody CreateRoomDTO dto) {
        CreateRoomResponseDTO updated = roomService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
