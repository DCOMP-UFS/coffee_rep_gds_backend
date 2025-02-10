package br.ufs.coffee_rep_gds_backend.entities;

import br.ufs.coffee_rep_gds_backend.enums.ScheduleStatus;
import br.ufs.coffee_rep_gds_backend.enums.WeekDay;
import jakarta.persistence.*;

import java.time.LocalTime;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "tb_schedules")
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "week_day", nullable = false)
    private WeekDay weekDay;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleStatus status;

    @ManyToOne
    @JoinColumn(name = "requester_id")
    private Requester requester;

    public Schedule() {
    }

    public Schedule(Long id, WeekDay weekDay, LocalTime startTime, LocalTime endTime, ScheduleStatus status, Requester requester) {
        this.id = id;
        this.weekDay = weekDay;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.requester = requester;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public WeekDay getWeekDay() {
        return weekDay;
    }

    public void setWeekDay(WeekDay weekDay) {
        this.weekDay = weekDay;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public ScheduleStatus getStatus() {
        return status;
    }

    public void setStatus(ScheduleStatus status) {
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
        Schedule schedule = (Schedule) o;
        return Objects.equals(id, schedule.id) && weekDay == schedule.weekDay && Objects.equals(startTime, schedule.startTime) && Objects.equals(endTime, schedule.endTime) && status == schedule.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, weekDay, startTime, endTime, status);
    }
}
