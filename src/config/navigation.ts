import {
  LayoutDashboard,
  Wallet,
  UserCircle,
  Bot,
  Sparkles,
  Coins,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** Translation key used with t() */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge count / label */
  badge?: string | number;
  /** If true, match exact path (default: prefix match) */
  exact?: boolean;
  /** If true, only shown to users with role === 'ADMIN' */
  adminOnly?: boolean;
  /** If true, excluded from the mobile bottom tab bar (still shown in header/drawer) */
  hideFromBottomNav?: boolean;
}

export interface NavSection {
  /** Optional section heading translation key */
  titleKey?: string;
  items: NavItem[];
}

/**
 * Primary navigation shown in sidebar & mobile drawer.
 * Extend this to add more routes.
 */
export const mainNavigation: NavSection[] = [
  {
    items: [
      {
        labelKey: 'nav.dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        exact: true,
      },
      {
        labelKey: 'nav.myWallet',
        href: '/my-wallet',
        icon: Wallet,
      },
      {
        labelKey: 'nav.portfolio',
        href: '/portfolio',
        icon: UserCircle,
        hideFromBottomNav: true,
      },
      {
        labelKey: 'nav.mevBot',
        href: import.meta.env.VITE_MEV_PAGE,
        icon: Bot,
      },
      {
        labelKey: 'nav.luckyBreak',
        href: '/lucky-break',
        icon: Sparkles,
      },
      {
        labelKey: 'nav.presale',
        href: '/presale',
        icon: Coins,
      },
    ],
  },
];
