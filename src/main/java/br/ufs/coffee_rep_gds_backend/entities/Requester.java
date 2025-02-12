package br.ufs.coffee_rep_gds_backend.entities;

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

    @Column(nullable = false)
    private Integer status;

    @OneToOne
    @JoinColumn(name = "requester_type_id", nullable = false)
    private RequesterType requesterType;

    @OneToMany(mappedBy = "requester")
    private List<Reservation> reservations;

    public Requester() {
    }

    public Requester(Long id, String name, String cpf, String contact_number, Integer status, RequesterType requesterType, List<Reservation> reservations) {
        this.id = id;
        this.name = name;
        this.cpf = cpf;
        this.contact_number = contact_number;
        this.status = status;
        this.requesterType = requesterType;
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

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public RequesterType getRequesterType() {
        return requesterType;
    }

    public void setRequesterType(RequesterType requesterType) {
        this.requesterType = requesterType;
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
        Requester requester = (Requester) o;
        return Objects.equals(id, requester.id) && Objects.equals(name, requester.name) && Objects.equals(cpf, requester.cpf) && status == requester.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, cpf, status);
    }
}
