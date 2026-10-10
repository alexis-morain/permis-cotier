/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EVENEMENT_DATE_EXAMEN } from './progression';

/**
 * Les rappels, dans la coquille. Le greffon est un double qui note ce qu'on
 * lui demande : c'est la seule façon de prouver, hors simulateur, qu'une date
 * posée donne quatre rappels à neuf heures et qu'une date retirée les tait.
 */
describe('les rappels, dans la coquille', () => {
  afterEach(() => {
    vi.doUnmock('./cible');
    vi.doUnmock('@capacitor/local-notifications');
    vi.useRealTimers();
  });

  interface Rappel {
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle: boolean };
  }

  function greffon(enAttente: number[] = []) {
    const LocalNotifications = {
      getPending: vi.fn(async () => ({ notifications: enAttente.map((id) => ({ id })) })),
      cancel: vi.fn(async (_: { notifications: { id: number }[] }) => {}),
      checkPermissions: vi.fn(async () => ({ display: 'granted' })),
      requestPermissions: vi.fn(async () => ({ display: 'granted' })),
      schedule: vi.fn(async (_: { notifications: Rappel[] }) => ({ notifications: [] })),
    };
    return LocalNotifications;
  }

  function posees(notifications: ReturnType<typeof greffon>): Rappel[] {
    expect(notifications.schedule).toHaveBeenCalledTimes(1);
    return notifications.schedule.mock.calls[0]![0].notifications;
  }

  async function chargerAvec(LocalNotifications: ReturnType<typeof greffon>) {
    vi.resetModules();
    vi.doMock('./cible', () => ({ POUR_APP: true }));
    vi.doMock('@capacitor/local-notifications', () => ({ LocalNotifications }));
    return import('./natif');
  }

  it('pose quatre rappels à neuf heures, J-7, J-3, J-1 et le jour même', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00') });
    const notifications = greffon();
    const { programmerRappels: programmer } = await chargerAvec(notifications);
    await programmer('2026-10-30');
    expect(notifications.cancel).not.toHaveBeenCalled();
    const rappels = posees(notifications);
    expect(rappels.map((n) => n.id)).toEqual([1707, 1703, 1701, 1700]);
    expect(rappels.map((n) => n.schedule.at.toISOString().slice(0, 10))).toEqual([
      '2026-10-23',
      '2026-10-27',
      '2026-10-29',
      '2026-10-30',
    ]);
    for (const n of rappels) expect(n.schedule.at.getHours()).toBe(9);
  });

  it('ne pose pas un rappel dont l’heure est passée', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-28T12:00:00') });
    const notifications = greffon();
    const { programmerRappels: programmer } = await chargerAvec(notifications);
    await programmer('2026-10-30');
    expect(posees(notifications).map((n) => n.id)).toEqual([1701, 1700]);
  });

  it('efface les rappels en attente avant de reposer les siens, et seulement les siens', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00') });
    const notifications = greffon([1707, 1700, 42]);
    const { programmerRappels: programmer } = await chargerAvec(notifications);
    await programmer('2026-11-15');
    expect(notifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1707 }, { id: 1700 }] });
    expect(notifications.schedule).toHaveBeenCalledTimes(1);
  });

  it('une date effacée tait les rappels sans en reposer, et sans demander de permission', async () => {
    const notifications = greffon([1707, 1703]);
    const { programmerRappels: programmer } = await chargerAvec(notifications);
    await programmer(null);
    expect(notifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1707 }, { id: 1703 }] });
    expect(notifications.schedule).not.toHaveBeenCalled();
    expect(notifications.requestPermissions).not.toHaveBeenCalled();
  });

  it('garde l’ordre des annonces : une date posée puis effacée aussitôt ne laisse aucun rappel', async () => {
    const notifications = greffon();
    // Le premier `schedule` traîne : sans file, l'effacement le doublerait.
    let liberer: () => void = () => {};
    notifications.schedule.mockImplementationOnce(
      () => new Promise<{ notifications: never[] }>((r) => { liberer = () => r({ notifications: [] }); }),
    );
    const { armerLesRappelsSurLaDate: armer } = await chargerAvec(notifications);
    const debrancher = armer();

    window.dispatchEvent(new CustomEvent(EVENEMENT_DATE_EXAMEN, { detail: '2099-10-30' }));
    await vi.waitFor(() => expect(notifications.schedule).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new CustomEvent(EVENEMENT_DATE_EXAMEN, { detail: null }));
    await new Promise((r) => setTimeout(r, 20));
    // L'effacement attend : un seul `getPending` tant que la pose n'est pas finie.
    expect(notifications.getPending).toHaveBeenCalledTimes(1);

    notifications.getPending.mockResolvedValue({ notifications: [{ id: 1707 }, { id: 1700 }] });
    liberer();
    await vi.waitFor(() => expect(notifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1707 }, { id: 1700 }] }));
    expect(notifications.getPending).toHaveBeenCalledTimes(2);
    expect(notifications.schedule).toHaveBeenCalledTimes(1);
    // L'écouteur survivrait au test : le greffon moqué se résout à l'appel.
    debrancher();
  });

  it('écoute l’annonce de la date, arme à la date posée, tait à la date effacée, puis se débranche', async () => {
    // Horloge réelle : `waitFor` et les fausses horloges ne s'entendent pas.
    // Une date loin devant garde les quatre rappels à venir.
    const notifications = greffon();
    const { armerLesRappelsSurLaDate: armer } = await chargerAvec(notifications);
    const debrancher = armer();

    window.dispatchEvent(new CustomEvent(EVENEMENT_DATE_EXAMEN, { detail: '2099-10-30' }));
    await vi.waitFor(() => expect(notifications.schedule).toHaveBeenCalledTimes(1));
    expect(posees(notifications).map((n) => n.id)).toEqual([1707, 1703, 1701, 1700]);

    notifications.getPending.mockResolvedValue({ notifications: [{ id: 1707 }] });
    window.dispatchEvent(new CustomEvent(EVENEMENT_DATE_EXAMEN, { detail: null }));
    await vi.waitFor(() => expect(notifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1707 }] }));
    expect(notifications.schedule).toHaveBeenCalledTimes(1);

    debrancher();
    window.dispatchEvent(new CustomEvent(EVENEMENT_DATE_EXAMEN, { detail: '2099-11-20' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(notifications.getPending).toHaveBeenCalledTimes(2);
    expect(notifications.schedule).toHaveBeenCalledTimes(1);
  });

  it('demande la permission à la date posée, et renonce sans bruit si elle est refusée', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00') });
    const notifications = greffon();
    notifications.checkPermissions.mockResolvedValue({ display: 'prompt' });
    notifications.requestPermissions.mockResolvedValue({ display: 'denied' });
    const { programmerRappels: programmer } = await chargerAvec(notifications);
    await expect(programmer('2026-10-30')).resolves.toBeUndefined();
    expect(notifications.requestPermissions).toHaveBeenCalledTimes(1);
    expect(notifications.schedule).not.toHaveBeenCalled();
  });
});
