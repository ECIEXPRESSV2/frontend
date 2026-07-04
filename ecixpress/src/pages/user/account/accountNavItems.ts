import {
  CreditCard,
  HelpCircle,
  LayoutGrid,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export interface AccountNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export const accountNavItems: AccountNavItem[] = [
  { id: 'resumen', label: 'Mi cuenta', icon: LayoutGrid, path: '/profile/resumen' },
  { id: 'pagos', label: 'Pagos', icon: CreditCard, path: '/profile/pagos' },
  { id: 'seguridad', label: 'Seguridad', icon: Shield, path: '/profile/seguridad' },
  { id: 'ayuda', label: 'Ayuda', icon: HelpCircle, path: '/profile/ayuda' },
];
