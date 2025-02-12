package br.ufs.coffee_rep_gds_backend.entities;

import br.ufs.coffee_rep_gds_backend.enums.ReservationStatus;
import jakarta.persistence.*;

import java.util.Date;
import java.util.Objects;

@Entity
@Table(name = "tb_reservations")
public class Reservation {

    @EmbeddedId
    private ReservationId id;

    @Column(name = "start_date")
    private Date startDate;

    @Column(name = "end_date")
    private Date endDate;

    private String observations;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = true)
    private Room room;

    @ManyToOne
    @JoinColumn(name = "requester_id", nullable = true)
    private Requester requester;

    public Reservation() {
    }

    public Reservation(ReservationId id, Date startDate, Date endDate, String observations, ReservationStatus status, Room room, Requester requester) {
        this.id = id;
        this.startDate = startDate;
        this.endDate = endDate;
        this.observations = observations;
        this.status = status;
        this.room = room;
        this.requester = requester;
    }

    public ReservationId getId() {
        return id;
    }

    public void setId(ReservationId id) {
        this.id = id;
    }

    public Date getStartDate() {
        return startDate;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public Date getEndDate() {
        return endDate;
    }

    public void setEndDate(Date endDate) {
        this.endDate = endDate;
    }

    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public void setStatus(ReservationStatus status) {
        this.status = status;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public Requester getRequester() {
        return requester;
    }

    public void setRequester(Requester requester) {
        this.requester = requester;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Reservation that = (Reservation) o;
        return Objects.equals(id, that.id) && Objects.equals(startDate, that.startDate) && Objects.equals(endDate, that.endDate) && Objects.equals(observations, that.observations) && status == that.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, startDate, endDate, observations, status);
    }
}
