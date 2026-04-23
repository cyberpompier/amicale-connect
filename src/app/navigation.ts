import {
  LayoutDashboard,
  Users,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarCheck,
  Settings,
  BarChart3,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

export interface SubNavItem {
  label: string
  path: string
}

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  subNav: SubNavItem[]
}

export const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    subNav: [],
  },
  {
    label: 'Amicalistes',
    path: '/membres',
    icon: Users,
    subNav: [
      { label: 'Liste', path: '/membres' },
      { label: 'Ajouter', path: '/membres/ajouter' },
      { label: 'Cotisations', path: '/membres/cotisations' },
    ],
  },
  {
    label: 'Livre de compte',
    path: '/comptabilite',
    icon: BookOpen,
    subNav: [
      { label: 'Transactions', path: '/comptabilite' },
      { label: 'Catégories', path: '/comptabilite/categories' },
      { label: 'Bilan', path: '/comptabilite/bilan' },
    ],
  },
  {
    label: 'Bureau',
    path: '/bureau',
    icon: Briefcase,
    subNav: [
      { label: 'Composition', path: '/bureau' },
      { label: 'Historique', path: '/bureau/historique' },
    ],
  },
  {
    label: 'Événements',
    path: '/evenements',
    icon: Calendar,
    subNav: [
      { label: 'Calendrier', path: '/evenements' },
      { label: 'Créer', path: '/evenements/creer' },
      { label: 'Archives', path: '/evenements/archives' },
    ],
  },
  {
    label: 'Sondages',
    path: '/sondages',
    icon: BarChart3,
    subNav: [
      { label: 'Tous les sondages', path: '/sondages' },
      { label: 'Créer', path: '/sondages/creer' },
    ],
  },
  {
    label: 'Boutique',
    path: '/boutique',
    icon: ShoppingBag,
    subNav: [
      { label: 'Catalogue', path: '/boutique' },
      { label: 'Panier', path: '/boutique/panier' },
      { label: 'Mes commandes', path: '/boutique/commandes' },
      { label: 'Gestion', path: '/boutique/gestion' },
    ],
  },
  {
    label: 'Calendriers',
    path: '/calendriers',
    icon: CalendarCheck,
    subNav: [
      { label: 'Tournée', path: '/calendriers' },
      { label: 'Secteurs', path: '/calendriers/secteurs' },
      { label: 'Statistiques', path: '/calendriers/statistiques' },
      { label: 'Historique', path: '/calendriers/historique' },
    ],
  },
]

export const settingsNavItem: NavItem = {
  label: 'Paramètres',
  path: '/parametres',
  icon: Settings,
  subNav: [
    { label: 'Général', path: '/parametres' },
    { label: 'Facturation', path: '/parametres/facturation' },
    { label: 'Équipe', path: '/parametres/equipe' },
  ],
}
