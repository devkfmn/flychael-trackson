import { describe, expect, it } from 'vitest';
import type { Equipment } from '../types';
import {
  gearOptions,
  resolveGearId,
  restoreGearFormValue,
  selectableByType,
} from './equipment';

function eq(overrides: Partial<Equipment>): Equipment {
  return {
    id: 'id',
    type: 'paraglider',
    producer: 'Ozone',
    model: 'Photon',
    size: 'MS',
    owner: null,
    serialNumber: null,
    manufactureDateISO: null,
    purchaseDateISO: null,
    saleDateISO: null,
    purchasePrice: null,
    salePrice: null,
    notes: null,
    status: 'active',
    lastCheckDateISO: null,
    maintenanceRule: null,
    legacyId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const activeWing = eq({ id: 'w-active', model: 'Active' });
const borrowedWing = eq({ id: 'w-borrowed', model: 'Borrowed', status: 'borrowed' });
const soldWing = eq({ id: 'w-sold', model: 'Sold', status: 'sold' });
const activeHarness = eq({
  id: 'h-active',
  type: 'harness',
  producer: 'Advance',
  model: 'Lightness',
});
const soldHarness = eq({
  id: 'h-sold',
  type: 'harness',
  producer: 'Advance',
  model: 'Old',
  status: 'sold',
});

const inventory = [activeWing, borrowedWing, soldWing, activeHarness, soldHarness];

describe('selectableByType', () => {
  it('includes active and borrowed gear but hides sold gear', () => {
    expect(selectableByType(inventory, 'paraglider').map((e) => e.id)).toEqual([
      'w-active',
      'w-borrowed',
    ]);
  });
});

describe('gearOptions', () => {
  it('adds a sold wing when the flight still references it', () => {
    expect(gearOptions(inventory, 'paraglider', 'w-sold').map((e) => e.id)).toEqual([
      'w-sold',
      'w-active',
      'w-borrowed',
    ]);
  });

  it('adds borrowed gear even when the current form value was cleared', () => {
    expect(
      gearOptions(inventory, 'paraglider', '', 'w-borrowed').map((e) => e.id),
    ).toEqual(['w-active', 'w-borrowed']);
  });

  it('adds a sold harness referenced by the stored flight', () => {
    expect(gearOptions(inventory, 'harness', 'h-sold').map((e) => e.id)).toEqual([
      'h-sold',
      'h-active',
    ]);
  });

  it('ignores empty referenced ids', () => {
    expect(gearOptions(inventory, 'paraglider', '', null).map((e) => e.id)).toEqual([
      'w-active',
      'w-borrowed',
    ]);
  });
});

describe('resolveGearId', () => {
  const wings = gearOptions(inventory, 'paraglider');

  it('keeps a preferred id that is in the options', () => {
    expect(resolveGearId('w-borrowed', wings, 'w-active')).toBe('w-borrowed');
  });

  it('treats empty string as missing and uses the fallback', () => {
    expect(resolveGearId('', wings, 'w-active')).toBe('w-active');
  });

  it('falls back when the preferred id is not in the options', () => {
    expect(resolveGearId('w-sold', wings, 'w-active')).toBe('w-active');
  });

  it('returns null when neither id is selectable', () => {
    expect(resolveGearId('w-sold', wings, 'w-gone')).toBeNull();
  });
});

describe('restoreGearFormValue', () => {
  it('waits until the stored id appears in the options', () => {
    expect(
      restoreGearFormValue({
        current: '',
        initial: 'w-active',
        options: [],
        alreadyRestored: false,
      }),
    ).toEqual({ value: null, restored: false });
  });

  it('restores the stored id once options are available', () => {
    expect(
      restoreGearFormValue({
        current: '',
        initial: 'w-sold',
        options: gearOptions(inventory, 'paraglider', 'w-sold'),
        alreadyRestored: false,
      }),
    ).toEqual({ value: 'w-sold', restored: true });
  });

  it('does not overwrite a user-chosen value', () => {
    expect(
      restoreGearFormValue({
        current: 'w-borrowed',
        initial: 'w-active',
        options: gearOptions(inventory, 'paraglider'),
        alreadyRestored: false,
      }),
    ).toEqual({ value: 'w-borrowed', restored: true });
  });

  it('leaves the current value alone after it has already restored', () => {
    expect(
      restoreGearFormValue({
        current: '',
        initial: 'w-active',
        options: gearOptions(inventory, 'paraglider'),
        alreadyRestored: true,
      }),
    ).toEqual({ value: null, restored: true });
  });
});
