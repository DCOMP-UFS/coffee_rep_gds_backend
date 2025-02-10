package br.ufs.coffee_rep_gds_backend.entities;

import br.ufs.coffee_rep_gds_backend.enums.RequesterType;
import br.ufs.coffee_rep_gds_backend.enums.Status;
import jakarta.persistence.*;

import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "tb_requesters")
public class Requester {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String cpf;
    private String contact_number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequesterType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @OneToOne
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @OneToMany(mappedBy = "requester")
    private List<Reservation> reservations;

    @OneToMany(mappedBy = "requester")
    private List<Schedule> schedules;

    public Requester() {
    }

    public Requester(Long id, String name, String cpf, String contact_number, RequesterType type, Status status, Position position, List<Reservation> reservations, List<Schedule> schedules) {
        this.id = id;
        this.name = name;
        this.cpf = cpf;
        this.contact_number = contact_number;
        this.type = type;
        this.status = status;
        this.position = position;
        this.reservations = reservations;
        this.schedules = schedules;
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

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getContact_number() {
        return contact_number;
    }

    public void setContact_number(String contact_number) {
        this.contact_number = contact_number;
    }

    public RequesterType getType() {
        return type;
    }

    public void setType(RequesterType type) {
        this.type = type;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Position getPosition() {
        return position;
    }

    public void setPosition(Position position) {
        this.position = position;
    }

    public List<Reservation> getReservations() {
        return reservations;
    }

    public void setReservations(List<Reservation> reservations) {
        this.reservations = reservations;
    }

    public List<Schedule> getSchedules() {
        return schedules;
    }

    public void setSchedules(List<Schedule> schedules) {
        this.schedules = schedules;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Requester requester = (Requester) o;
        return Objects.equals(id, requester.id) && Objects.equals(name, requester.name) && Objects.equals(cpf, requester.cpf) && Objects.equals(contact_number, requester.contact_number) && type == requester.type && status == requester.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, cpf, contact_number, type, status);
    }
}
