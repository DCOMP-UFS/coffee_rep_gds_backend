package br.ufs.coffee_rep_gds_backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.Objects;

@Embeddable
public class ReservationId {

    @Column(name = "room_id", nullable = false, insertable = false, updatable = false)
    private Long roomId;

    @Column(name = "requester_id", nullable = false, insertable = false, updatable = false)
    private Long requesterId;

    public ReservationId() {
    }

    public ReservationId(Long roomId, Long requesterId) {
        this.roomId = roomId;
        this.requesterId = requesterId;
    }

    public Long getRoomId() {
        return roomId;
    }

    public void setRoomId(Long roomId) {
        this.roomId = roomId;
    }

    public Long getRequesterId() {
        return requesterId;
    }

    public void setRequesterId(Long requesterId) {
        this.requesterId = requesterId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ReservationId that = (ReservationId) o;
        return Objects.equals(roomId, that.roomId) && Objects.equals(requesterId, that.requesterId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomId, requesterId);
    }
}
