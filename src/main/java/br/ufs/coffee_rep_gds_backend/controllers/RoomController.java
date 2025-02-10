package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.dtos.RoomResponseDto;
import br.ufs.coffee_rep_gds_backend.services.RoomService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/room")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public ResponseEntity<Page<RoomResponseDto>> getAllRooms(Pageable pageable) {
        Page<RoomResponseDto> allActiveRooms = roomService.getAllActiveRooms(pageable);
        return ResponseEntity.ok(allActiveRooms);
    }

    @GetMapping("/{id}")
    public String getRoomById(@PathVariable Long id) {
        return roomService.getRoomById(id);
    }
}
