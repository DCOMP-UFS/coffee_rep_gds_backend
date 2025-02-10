package br.ufs.coffee_rep_gds_backend.entities;

import br.ufs.coffee_rep_gds_backend.enums.Status;
import jakarta.persistence.*;

import java.util.Objects;

@Entity
@Table(name = "tb_positions")
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @OneToOne(mappedBy = "position")
    private Requester requester;

    public Position() {
    }

    public Position(Long id, String name, Status status, Requester requester) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.requester = requester;
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

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
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
        Position position = (Position) o;
        return Objects.equals(id, position.id) && Objects.equals(name, position.name) && status == position.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, status);
    }
}
