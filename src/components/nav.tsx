import type { ComponentType, SVGProps } from 'react';
import {
  AddIcon,
  DashboardIcon,
  EquipmentIcon,
  FlightIcon,
  ImportIcon,
  MoneyIcon,
  SettingsIcon,
  WrenchIcon,
} from './icons';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Show in the mobile bottom navigation bar. */
  primary?: boolean;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, primary: true, end: true },
  { to: '/flights', label: 'Flights', icon: FlightIcon, primary: true },
  { to: '/flights/new', label: 'Add Flight', icon: AddIcon, primary: true },
  { to: '/equipment', label: 'Equipment', icon: EquipmentIcon, primary: true },
  { to: '/maintenance', label: 'Maintenance', icon: WrenchIcon },
  { to: '/expenses', label: 'Expenses', icon: MoneyIcon },
  { to: '/import', label: 'Import', icon: ImportIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, primary: true },
];
