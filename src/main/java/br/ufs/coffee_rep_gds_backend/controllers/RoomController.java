package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.response.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.services.RoomService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/room")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public Page<RoomResponseDto> getAllRooms(Pageable pageable) {
        return roomService.getAllActiveRooms(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponseDto> getRoomById(@PathVariable Long id) {
        RoomResponseDto room = roomService.getRoomById(id);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/section/{sectionId}")
    public Page<RoomResponseDto> getRoomsBySectionId(@PathVariable Long sectionId, Pageable pageable) {
        return roomService.getRoomsBySectionId(sectionId, pageable);
    }
}
