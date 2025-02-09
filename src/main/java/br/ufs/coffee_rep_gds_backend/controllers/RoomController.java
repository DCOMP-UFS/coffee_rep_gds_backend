package br.ufs.coffee_rep_gds_backend.controllers;

import br.ufs.coffee_rep_gds_backend.services.RoomService;
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
    public String getAllRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/{id}")
    public String getRoomById(@PathVariable Long id) {
        return roomService.getRoomById(id);
    }
}
