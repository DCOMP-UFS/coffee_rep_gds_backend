package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.services.application.RoomService;
import org.springframework.data.domain.Page;
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
        return roomService.getAllActiveRooms(nome, tipo, setor, pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponseDto> getRoomById(@PathVariable Long id) {
        RoomResponseDto dto = roomService.getRoomById(id);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/section/{sectionId}")
    public Page<RoomResponseDto> getRoomsBySectionId(
            @PathVariable Long sectionId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String tipo,
            Pageable pageable
    ) {
        return roomService.getRoomsBySectionId(sectionId, nome, tipo, pageable);
    }
}
