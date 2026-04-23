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
import { BoutiquePage } from '@/features/boutique/BoutiquePage'
import { BoutiqueDetailPage } from '@/features/boutique/BoutiqueDetailPage'
import { BoutiqueCartPage } from '@/features/boutique/BoutiqueCartPage'
import { BoutiqueCheckoutPage } from '@/features/boutique/BoutiqueCheckoutPage'
import { BoutiqueCommandesPage } from '@/features/boutique/BoutiqueCommandesPage'
import { BoutiqueCommandeDetailPage } from '@/features/boutique/BoutiqueCommandeDetailPage'
import { BoutiqueGestionPage } from '@/features/boutique/BoutiqueGestionPage'
import { BoutiqueGestionCommandesAdminPage } from '@/features/boutique/BoutiqueGestionCommandesAdminPage'
import { BoutiqueGestionProduitsList } from '@/features/boutique/BoutiqueGestionProduitsList'
import { BoutiqueGestionProduitForm } from '@/features/boutique/BoutiqueGestionProduitForm'
import { CalendriersPage } from '@/features/calendriers/CalendriersPage'
import { CalendriersSecteursPage } from '@/features/calendriers/CalendriersSecteursPage'
import { CalendriersSecteurDetailPage } from '@/features/calendriers/CalendriersSecteurDetailPage'
import { CalendriersSecteurFormPage } from '@/features/calendriers/CalendriersSecteurFormPage'
import { CalendriersSaisieVentePage } from '@/features/calendriers/CalendriersSaisieVentePage'
import { CalendriersStatistiquesPage } from '@/features/calendriers/CalendriersStatistiquesPage'
import { CalendriersHistoriquePage } from '@/features/calendriers/CalendriersHistoriquePage'
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
      // Boutique
      {
        path: 'boutique',
        element: <BoutiquePage />,
      },
      {
        path: 'boutique/panier',
        element: <BoutiqueCartPage />,
      },
      {
        path: 'boutique/checkout',
        element: <BoutiqueCheckoutPage />,
      },
      {
        path: 'boutique/commandes',
        element: <BoutiqueCommandesPage />,
      },
      {
        path: 'boutique/commandes/:id',
        element: <BoutiqueCommandeDetailPage />,
      },
      {
        path: 'boutique/gestion',
        element: <BoutiqueGestionPage />,
      },
      {
        path: 'boutique/gestion/commandes',
        element: <BoutiqueGestionCommandesAdminPage />,
      },
      {
        path: 'boutique/gestion/produits',
        element: <BoutiqueGestionProduitsList />,
      },
      {
        path: 'boutique/gestion/produits/creer',
        element: <BoutiqueGestionProduitForm />,
      },
      {
        path: 'boutique/gestion/produits/:id',
        element: <BoutiqueGestionProduitForm />,
      },
      {
        path: 'boutique/:id',
        element: <BoutiqueDetailPage />,
      },
      // Calendriers
      {
        path: 'calendriers',
        element: <CalendriersPage />,
      },
      {
        path: 'calendriers/secteurs',
        element: <CalendriersSecteursPage />,
      },
      {
        path: 'calendriers/secteurs/creer',
        element: <CalendriersSecteurFormPage />,
      },
      {
        path: 'calendriers/secteurs/:id',
        element: <CalendriersSecteurDetailPage />,
      },
      {
        path: 'calendriers/secteurs/:id/editer',
        element: <CalendriersSecteurFormPage />,
      },
      {
        path: 'calendriers/secteurs/:id/vente',
        element: <CalendriersSaisieVentePage />,
      },
      {
        path: 'calendriers/statistiques',
        element: <CalendriersStatistiquesPage />,
      },
      {
        path: 'calendriers/historique',
        element: <CalendriersHistoriquePage />,
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
