import { limaMinutesOfDay, limaDiaSemana } from './lima-time';

/**
 * Unit tests de la conversión a hora de pared de Lima (UTC−5, sin DST).
 * Son deterministas y NO dependen de la TZ del proceso (usan getUTC*), así que
 * pasan igual en el servidor, en CI o en Windows.
 */
describe('lima-time', () => {
  describe('limaMinutesOfDay', () => {
    it('12:22 UTC → 07:22 Lima (442 min)', () => {
      expect(limaMinutesOfDay(new Date('2026-07-06T12:22:00Z'))).toBe(7 * 60 + 22);
    });

    it('05:00 UTC → 00:00 Lima (0)', () => {
      expect(limaMinutesOfDay(new Date('2026-07-06T05:00:00Z'))).toBe(0);
    });

    it('04:59 UTC → 23:59 Lima del día anterior (1439) — cruce de medianoche', () => {
      expect(limaMinutesOfDay(new Date('2026-07-06T04:59:00Z'))).toBe(23 * 60 + 59);
    });

    it('00:00 UTC → 19:00 Lima del día anterior (1140)', () => {
      expect(limaMinutesOfDay(new Date('2026-07-06T00:00:00Z'))).toBe(19 * 60);
    });

    it('07:00 Lima exacto para una clase (marca 12:00 UTC) = 420', () => {
      expect(limaMinutesOfDay(new Date('2026-07-06T12:00:00Z'))).toBe(7 * 60);
    });
  });

  describe('limaDiaSemana', () => {
    it('lunes al mediodía Lima → 1', () => {
      // 2026-07-06 es lunes. 12:00Z = 07:00 Lima lunes.
      expect(limaDiaSemana(new Date('2026-07-06T12:00:00Z'))).toBe(1);
    });

    it('sábado → 6', () => {
      // 2026-07-04 es sábado.
      expect(limaDiaSemana(new Date('2026-07-04T18:00:00Z'))).toBe(6);
    });

    it('domingo → 7', () => {
      // 2026-07-05 es domingo.
      expect(limaDiaSemana(new Date('2026-07-05T18:00:00Z'))).toBe(7);
    });

    it('lunes 02:00 UTC cae en domingo Lima (21:00) → 7 — cruce de día', () => {
      // 2026-07-06 02:00Z = 2026-07-05 21:00 Lima (domingo).
      expect(limaDiaSemana(new Date('2026-07-06T02:00:00Z'))).toBe(7);
    });
  });
});
