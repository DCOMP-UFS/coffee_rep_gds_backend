import { describe, expect, it } from 'vitest';
import {
  alreadyBackfilled,
  inferAbsenceEvents,
  inferCadastroEvents,
  inferReservationEvents,
  inferUserRegisterEvent,
} from './backfill-inference';
import { RESERVATION_APPROVED, RESERVATION_CANCELLED, STATUS_ACTIVE, STATUS_INACTIVE } from '../database/documents';
import { UNKNOWN_ACTOR_NAME } from './audit.types';

const names = (id: number) => (id === 5 ? 'Alice' : id === 7 ? 'Bob' : null);

describe('backfill-inference', () => {
  it('create nunca editado usa updatedBy como ator', () => {
    const events = inferCadastroEvents(
      'rooms',
      'room',
      {
        _id: 10,
        name: 'Sala A',
        sectionId: 1,
        status: STATUS_ACTIVE,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: null,
        updatedBy: 5,
      },
      names,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: 'room.create',
      actorUserId: 5,
      actorName: 'Alice',
      details: expect.objectContaining({
        backfill: true,
        backfillSource: 'rooms',
        backfillSourceId: 10,
        actorInferred: true,
      }),
    });
  });

  it('create+update: create sem ator confiável e update com último editor', () => {
    const events = inferCadastroEvents(
      'sections',
      'section',
      {
        _id: 4,
        name: 'Pediatria',
        status: STATUS_ACTIVE,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-02-01T10:00:00Z'),
        updatedBy: 7,
      },
      names,
    );

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      action: 'section.create',
      actorUserId: null,
      actorName: UNKNOWN_ACTOR_NAME,
      details: expect.objectContaining({ actorInferred: false }),
    });
    expect(events[1]).toMatchObject({
      action: 'section.update',
      actorUserId: 7,
      actorName: 'Bob',
    });
  });

  it('soft-delete emite delete no lugar de update', () => {
    const events = inferCadastroEvents(
      'requesters',
      'requester',
      {
        _id: 3,
        name: 'Dr. X',
        status: STATUS_INACTIVE,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-03-01T10:00:00Z'),
        updatedBy: 5,
      },
      names,
    );

    expect(events.map((e) => e.action)).toEqual(['requester.create', 'requester.delete']);
  });

  it('reserva cancelada só gera create (sem inventar cancel)', () => {
    const events = inferReservationEvents(
      {
        _id: 99,
        roomId: 1,
        requesterId: 2,
        status: RESERVATION_CANCELLED,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: null,
        updatedBy: 5,
      },
      names,
    );

    expect(events).toHaveLength(1);
    expect(events[0].action).toBe('reservation.create');
    expect(events[0].details.cancelada).toBe(true);
    expect(events.some((e) => e.action === 'reservation.cancel')).toBe(false);
  });

  it('reserva ativa gera create com criador', () => {
    const events = inferReservationEvents(
      {
        _id: 1,
        status: RESERVATION_APPROVED,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: null,
        updatedBy: 5,
      },
      names,
    );
    expect(events[0].actorUserId).toBe(5);
  });

  it('ausência com update gera create+update', () => {
    const events = inferAbsenceEvents(
      {
        _id: 8,
        requesterId: 2,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-01-05T10:00:00Z'),
        updatedBy: 5,
      },
      names,
    );
    expect(events.map((e) => e.action)).toEqual(['absence.create', 'absence.update']);
  });

  it('usuário gera auth.register com ele mesmo como ator', () => {
    const event = inferUserRegisterEvent({
      _id: 5,
      name: 'Alice',
      email: 'a@b.com',
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: null,
      updatedBy: null,
    });
    expect(event).toMatchObject({
      action: 'auth.register',
      actorUserId: 5,
      actorName: 'Alice',
      details: expect.objectContaining({ backfillSource: 'users', backfillSourceId: 5 }),
    });
  });

  it('alreadyBackfilled evita duplicatas', () => {
    const events = inferCadastroEvents(
      'rooms',
      'room',
      {
        _id: 10,
        name: 'Sala A',
        status: STATUS_ACTIVE,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: null,
        updatedBy: 5,
      },
      names,
    );
    expect(alreadyBackfilled([], events[0])).toBe(false);
    expect(
      alreadyBackfilled(
        [{ action: 'room.create', details: { backfillSource: 'rooms', backfillSourceId: 10 } }],
        events[0],
      ),
    ).toBe(true);
  });
});
