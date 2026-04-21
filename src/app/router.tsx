import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { AuthCallback } from '@/features/auth/AuthCallback'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MembresListPage } from '@/features/membres/MembresListPage'
import { MembresDetailPage } from '@/features/membres/MembresDetailPage'
import { MembresAddPage } from '@/features/membres/MembresAddPage'
import { CotisationsPage } from '@/features/membres/CotisationsPage'
import { TransactionsPage } from '@/features/comptabilite/TransactionsPage'
import { TransactionDetailPage } from '@/features/comptabilite/TransactionDetailPage'
import { CategoriesPage } from '@/features/comptabilite/CategoriesPage'
import { BilanPage } from '@/features/comptabilite/BilanPage'
import { BureauPage } from '@/features/bureau/BureauPage'
import { BureauHistoriquePage } from '@/features/bureau/BureauHistoriquePage'
import { EvenementsPage } from '@/features/evenements/EvenementsPage'
import { EvenementsCreerPage } from '@/features/evenements/EvenementsCreerPage'
import { EvenementsArchivesPage } from '@/features/evenements/EvenementsArchivesPage'
import { EvenementDetailPage } from '@/features/evenements/EvenementDetailPage'
import { SondagesPage } from '@/features/sondages/SondagesPage'
import { SondagesCreerPage } from '@/features/sondages/SondagesCreerPage'
import { ParametresPage } from '@/features/parametres/ParametresPage'
import { ParametresFacturationPage } from '@/features/parametres/ParametresFacturationPage'
import { ParametresEquipePage } from '@/features/parametres/ParametresEquipePage'

export const router = createBrowserRouter([
  // Auth routes (publiques)
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/register',
    element: <RegisterPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },

  // App routes (protégées par AppShell)
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      // Amicalistes
      {
        path: 'membres',
        element: <MembresListPage />,
      },
      {
        path: 'membres/:id',
        element: <MembresDetailPage />,
      },
      {
        path: 'membres/ajouter',
        element: <MembresAddPage />,
      },
      {
        path: 'membres/editer/:id',
        element: <MembresAddPage />,
      },
      {
        path: 'membres/cotisations',
        element: <CotisationsPage />,
      },
      // Comptabilité
      {
        path: 'comptabilite',
        element: <TransactionsPage />,
      },
      {
        path: 'comptabilite/categories',
        element: <CategoriesPage />,
      },
      {
        path: 'comptabilite/bilan',
        element: <BilanPage />,
      },
      {
        path: 'comptabilite/:id',
        element: <TransactionDetailPage />,
      },
      // Bureau
      {
        path: 'bureau',
        element: <BureauPage />,
      },
      {
        path: 'bureau/historique',
        element: <BureauHistoriquePage />,
      },
      // Événements
      {
        path: 'evenements',
        element: <EvenementsPage />,
      },
      {
        path: 'evenements/creer',
        element: <EvenementsCreerPage />,
      },
      {
        path: 'evenements/archives',
        element: <EvenementsArchivesPage />,
      },
      {
        path: 'evenements/:id',
        element: <EvenementDetailPage />,
      },
      // Sondages
      {
        path: 'sondages',
        element: <SondagesPage />,
      },
      {
        path: 'sondages/creer',
        element: <SondagesCreerPage />,
      },
      // Paramètres
      {
        path: 'parametres',
        element: <ParametresPage />,
      },
      {
        path: 'parametres/facturation',
        element: <ParametresFacturationPage />,
      },
      {
        path: 'parametres/equipe',
        element: <ParametresEquipePage />,
      },
    ],
  },
])
