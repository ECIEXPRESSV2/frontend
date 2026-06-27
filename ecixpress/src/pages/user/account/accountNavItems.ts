import {
  LayoutGrid, User, Wallet, Shield, HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export interface AccountNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export const accountNavItems: AccountNavItem[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid, path: '/profile/resumen' },
  { id: 'informacion', label: 'Información personal', icon: User, path: '/profile/informacion' },
  { id: 'billetera', label: 'Billetera', icon: Wallet, path: '/profile/billetera' },
  { id: 'seguridad', label: 'Seguridad', icon: Shield, path: '/profile/seguridad' },
  { id: 'ayuda', label: 'Ayuda', icon: HelpCircle, path: '/profile/ayuda' },
];
