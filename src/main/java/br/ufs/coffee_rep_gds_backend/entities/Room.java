package br.ufs.coffee_rep_gds_backend.entities;

import br.ufs.coffee_rep_gds_backend.enums.RoomType;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import jakarta.persistence.*;

import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "tb_rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @ManyToOne
    @JoinColumn(name = "section_id", nullable = true)
    private Section section;

    @OneToMany(mappedBy = "room")
    private List<Reservation> reservations;

    public Room() {
    }

    public Room(Long id, String name, RoomType type, Status status, Section section, List<Reservation> reservations) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.status = status;
        this.section = section;
        this.reservations = reservations;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public RoomType getType() {
        return type;
    }

    public void setType(RoomType type) {
        this.type = type;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Section getSection() {
        return section;
    }

    public void setSection(Section section) {
        this.section = section;
    }

    public List<Reservation> getReservations() {
        return reservations;
    }

    public void setReservations(List<Reservation> reservations) {
        this.reservations = reservations;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Room room = (Room) o;
        return Objects.equals(id, room.id) && Objects.equals(name, room.name) && type == room.type && status == room.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, type, status);
    }
}
