import { useMemo, useState } from 'react'
import {
  TrendingUp,
  Users,
  MapPin,
  Package,
  Award,
  Euro,
  CalendarDays,
  Trophy,
  Download,
} from 'lucide-react'
import jsPDF from 'jspdf'
import { supabase } from '@/lib/supabase'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierStats } from '@/hooks/useCalendrierStats'
import { useAssociation } from '@/features/association/AssociationContext'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export function CalendriersStatistiquesPage() {
  const { currentAssociation } = useAssociation()
  const { activeCampagne, campagnes, loading: campLoading } = useCalendrierCampagnes()
  const {
    amicalisteStats,
    secteurStats,
    dailyVentes,
    totalAmount,
    totalCalendriers,
    totalVentes,
    loading,
  } = useCalendrierStats(activeCampagne?.id)
  const [exportingPDF, setExportingPDF] = useState(false)

  const averageBasket = useMemo(
    () => (totalVentes > 0 ? totalAmount / totalVentes : 0),
    [totalAmount, totalVentes]
  )

  const maxDailyAmount = useMemo(
    () => Math.max(...dailyVentes.map((d) => d.amount), 0),
    [dailyVentes]
  )

  const progressionGlobale = useMemo(() => {
    if (!activeCampagne || activeCampagne.objective_amount === 0) return 0
    return Math.min(100, (totalAmount / activeCampagne.objective_amount) * 100)
  }, [activeCampagne, totalAmount])

  const handleExportPDF = async () => {
    if (!activeCampagne || !currentAssociation) return
    setExportingPDF(true)

    try {
      // Charger les données détaillées des secteurs
      const { data: secteursDetailed } = await supabase
        .from('calendrier_secteurs')
        .select(`
          id,
          name,
          color,
          objective_amount,
          objective_calendriers,
          status,
          calendrier_secteur_equipiers(count),
          calendrier_adresses(count),
          calendrier_stocks(allocated_qty, used_qty, returned_qty)
        `)
        .eq('campagne_id', activeCampagne.id)

      const secteursData = secteursDetailed || []
      const doc = new jsPDF()
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPos = 15

      // Couleurs
      const primaryColor = [220, 38, 38] // Red
      const secondaryColor = [59, 130, 246] // Blue
      const accentColor = [34, 197, 94] // Green
      const lightGray = [249, 250, 251]
      const darkGray = [75, 85, 99]
      const textGray = [107, 114, 128]

      // ===== PAGE 1: HEADER ET KPIs =====

      // Background header
      doc.setFillColor(...lightGray)
      doc.rect(0, 0, pageWidth, 50, 'F')

      // Ligne dégradé (effet de barre colorée)
      doc.setFillColor(...primaryColor)
      doc.rect(0, 0, pageWidth, 3, 'F')

      // Logo (si disponible)
      if (currentAssociation.logo_url) {
        try {
          doc.addImage(currentAssociation.logo_url, 'PNG', 15, 8, 20, 20)
        } catch (e) {
          // Logo non chargeable, on continue
        }
      }

      // Titre
      doc.setFontSize(24)
      doc.setTextColor(...primaryColor)
      doc.setFont(undefined, 'bold')
      doc.text('RAPPORT DE TOURNÉE', pageWidth / 2, 18, { align: 'center' })

      // Info campagne
      doc.setFontSize(11)
      doc.setTextColor(...textGray)
      doc.setFont(undefined, 'normal')
      doc.text(`${currentAssociation.name} • ${activeCampagne.year}`, pageWidth / 2, 28, { align: 'center' })
      doc.text(activeCampagne.name, pageWidth / 2, 34, { align: 'center' })

      yPos = 55

      // ===== KPIs CARDS =====
      const kpiCards = [
        {
          label: 'Collecte',
          value: formatCurrency(totalAmount),
          detail: `/ ${formatCurrency(Number(activeCampagne.objective_amount))}`,
          color: accentColor,
        },
        {
          label: 'Progression',
          value: `${progressionGlobale.toFixed(0)}%`,
          detail: 'de l\'objectif',
          color: secondaryColor,
        },
        {
          label: 'Calendriers',
          value: `${totalCalendriers}`,
          detail: `/ ${activeCampagne.objective_calendriers}`,
          color: primaryColor,
        },
        {
          label: 'Ventes',
          value: `${totalVentes}`,
          detail: `Panier moy. ${formatCurrency(totalVentes > 0 ? totalAmount / totalVentes : 0)}`,
          color: [168, 85, 247],
        },
      ]

      const cardWidth = (pageWidth - 30) / 2
      const cardHeight = 30
      const cardMargin = 5

      kpiCards.forEach((card, idx) => {
        const col = idx % 2
        const row = Math.floor(idx / 2)
        const x = 15 + col * (cardWidth + 10)
        const y = yPos + row * (cardHeight + 10)

        // Card background
        doc.setFillColor(...lightGray)
        doc.rect(x, y, cardWidth, cardHeight, 'F')

        // Colored left border
        doc.setFillColor(...card.color)
        doc.rect(x, y, 4, cardHeight, 'F')

        // Label
        doc.setFontSize(10)
        doc.setTextColor(...darkGray)
        doc.setFont(undefined, 'bold')
        doc.text(card.label, x + 8, y + 7)

        // Value
        doc.setFontSize(16)
        doc.setTextColor(...card.color)
        doc.setFont(undefined, 'bold')
        doc.text(card.value, x + 8, y + 18)

        // Detail
        doc.setFontSize(9)
        doc.setTextColor(...textGray)
        doc.setFont(undefined, 'normal')
        doc.text(card.detail, x + 8, y + 26)
      })

      yPos += 75

      // ===== TOP AMICALISTES =====
      if (amicalisteStats.length > 0) {
        // Section title avec background
        doc.setFillColor(...primaryColor)
        doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('CLASSEMENT DES AMICALISTES', 18, yPos + 3)
        yPos += 12

        // En-têtes tableau
        doc.setFontSize(11)
        doc.setTextColor(255, 255, 255)
        doc.setFont(undefined, 'bold')
        doc.setFillColor(...primaryColor)
        doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
        doc.text('Rang', 18, yPos)
        doc.text('Amicaliste', 35, yPos)
        doc.text('Collecte', 110, yPos)
        doc.text('Calendriers', 150, yPos)
        yPos += 10

        // Données
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        amicalisteStats.slice(0, 10).forEach((s, idx) => {
          if (yPos > pageHeight - 25) {
            doc.addPage()
            doc.setFillColor(...lightGray)
            doc.rect(0, 0, pageWidth, pageHeight, 'F')
            yPos = 15
          }

          // Couleur alternée
          if (idx % 2 === 0) {
            doc.setFillColor(255, 255, 255)
          } else {
            doc.setFillColor(...lightGray)
          }
          doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')

          // Ranking avec couleur
          doc.setTextColor(...primaryColor)
          doc.setFont(undefined, 'bold')
          const ranking = idx === 0 ? '[1]' : idx === 1 ? '[2]' : idx === 2 ? '[3]' : `[${idx + 1}]`
          doc.text(ranking, 18, yPos)

          // Name
          doc.setTextColor(...darkGray)
          doc.setFont(undefined, 'normal')
          const name = `${s.first_name} ${s.last_name}`.substring(0, 35)
          doc.text(name, 35, yPos)

          // Amount
          doc.setTextColor(...accentColor)
          doc.setFont(undefined, 'bold')
          doc.text(formatCurrency(s.total_amount), 110, yPos)

          // Calendriers
          doc.setTextColor(...darkGray)
          doc.setFont(undefined, 'normal')
          doc.text(`${s.total_calendriers}`, 150, yPos)

          yPos += 9
        })

        yPos += 8
      }

      // ===== TOP SECTEURS =====
      if (secteurStats.length > 0) {
        doc.setFillColor(...secondaryColor)
        doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('SECTEURS LES PLUS PERFORMANTS', 18, yPos + 3)
        yPos += 12

        // En-têtes
        doc.setFontSize(11)
        doc.setTextColor(255, 255, 255)
        doc.setFont(undefined, 'bold')
        doc.setFillColor(...secondaryColor)
        doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
        doc.text('Secteur', 18, yPos)
        doc.text('Collecte', 100, yPos)
        doc.text('Progression', 145, yPos)
        yPos += 10

        // Données
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        secteurStats.slice(0, 8).forEach((s, idx) => {
          if (yPos > pageHeight - 25) {
            doc.addPage()
            doc.setFillColor(...lightGray)
            doc.rect(0, 0, pageWidth, pageHeight, 'F')
            yPos = 15
          }

          if (idx % 2 === 0) {
            doc.setFillColor(255, 255, 255)
          } else {
            doc.setFillColor(...lightGray)
          }
          doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')

          doc.setTextColor(...darkGray)
          doc.setFont(undefined, 'normal')
          const secteurName = s.secteur_name.substring(0, 25)
          doc.text(secteurName, 18, yPos)

          doc.setTextColor(...accentColor)
          doc.setFont(undefined, 'bold')
          doc.text(formatCurrency(s.total_amount), 100, yPos)

          // Barre de progression
          const progressBarWidth = 40
          const progressPercent = Math.min(100, s.progression_percent)
          doc.setDrawColor(...secondaryColor)
          doc.setLineWidth(0.8)
          doc.rect(145, yPos - 3, progressBarWidth, 5)
          doc.setFillColor(...secondaryColor)
          doc.rect(145, yPos - 3, (progressBarWidth * progressPercent) / 100, 5, 'F')

          doc.setTextColor(...darkGray)
          doc.setFont(undefined, 'bold')
          doc.setFontSize(9)
          doc.text(`${s.progression_percent.toFixed(0)}%`, 188, yPos)

          yPos += 9
        })
      }

      // ===== RÉSUMÉ PAR SECTEUR =====
      if (secteursData.length > 0) {
        if (yPos > pageHeight - 70) {
          doc.addPage()
          doc.setFillColor(...lightGray)
          doc.rect(0, 0, pageWidth, pageHeight, 'F')
          yPos = 15
        }

        doc.setFillColor(...darkGray)
        doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('RESUME PAR SECTEUR', 18, yPos + 3)
        yPos += 12

        // En-têtes
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.setFont(undefined, 'bold')
        doc.setFillColor(...darkGray)
        doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
        doc.text('Secteur', 18, yPos)
        doc.text('Collecte', 70, yPos)
        doc.text('Calendriers', 110, yPos)
        doc.text('Adresses', 155, yPos)
        doc.text('Stock', 185, yPos)
        yPos += 10

        // Données secteurs
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        secteursData.forEach((s: any, idx: number) => {
          if (yPos > pageHeight - 25) {
            doc.addPage()
            doc.setFillColor(...lightGray)
            doc.rect(0, 0, pageWidth, pageHeight, 'F')
            yPos = 15
          }

          // Couleur alternée
          if (idx % 2 === 0) {
            doc.setFillColor(255, 255, 255)
          } else {
            doc.setFillColor(...lightGray)
          }
          doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')

          // Secteur
          doc.setTextColor(...darkGray)
          doc.setFont(undefined, 'normal')
          const sectorData = secteurStats.find((x) => x.secteur_id === s.id)
          const sectorName = s.name.substring(0, 18)
          doc.text(sectorName, 18, yPos)

          // Collecte
          doc.setTextColor(...accentColor)
          doc.setFont(undefined, 'bold')
          const collected = sectorData?.total_amount ?? 0
          const collecteStr = formatCurrency(collected).substring(0, 12)
          doc.text(collecteStr, 70, yPos)

          // Calendriers
          doc.setTextColor(...darkGray)
          doc.setFont(undefined, 'normal')
          const cals = sectorData?.total_calendriers ?? 0
          doc.text(`${cals}/${s.objective_calendriers}`, 110, yPos)

          // Adresses
          const adressesCount = s.calendrier_adresses?.[0]?.count ?? 0
          doc.text(`${adressesCount}`, 155, yPos)

          // Stock
          const stock = s.calendrier_stocks?.[0]
          const stockStr = stock
            ? `${stock.used_qty}/${stock.allocated_qty}`
            : '-'
          doc.text(stockStr, 185, yPos)

          yPos += 9
        })
      }

      // ===== FOOTER =====
      yPos += 8
      doc.setFontSize(9)
      doc.setTextColor(...textGray)
      doc.setFont(undefined, 'normal')
      doc.text(
        `Rapport généré le ${new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      // Numérotation pages
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(...textGray)
        doc.setFont(undefined, 'normal')
        doc.text(`Page ${i}/${totalPages}`, pageWidth - 18, pageHeight - 10, { align: 'right' })
      }

      // Save
      doc.save(`Rapport_Tournee_${activeCampagne.name}_${activeCampagne.year}.pdf`)
    } catch (err) {
      console.error('Erreur export PDF:', err)
      alert('Erreur lors de la génération du PDF')
    }
    setExportingPDF(false)
  }

  if (campLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!activeCampagne) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">
          Aucune campagne active. Lancez une tournée pour commencer à suivre vos statistiques.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Statistiques</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {activeCampagne.name} — {campagnes.length} campagne{campagnes.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exportingPDF}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exportingPDF ? 'Génération...' : 'Export PDF'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Euro className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Total collecté
            </p>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalAmount)}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Obj. {formatCurrency(Number(activeCampagne.objective_amount))}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Calendriers
            </p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{totalCalendriers}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Obj. {activeCampagne.objective_calendriers}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Ventes
            </p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{totalVentes}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Panier moyen {formatCurrency(averageBasket)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Progression
            </p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{progressionGlobale.toFixed(0)}%</p>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-orange-500 rounded-full"
              style={{ width: `${progressionGlobale}%` }}
            />
          </div>
        </div>
      </div>

      {/* Évolution des ventes */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
        <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-[var(--color-primary)]" />
          Évolution des ventes
        </h2>
        {dailyVentes.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] italic text-center py-6">
            Aucune vente enregistrée.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-48 border-b border-[var(--color-border)] pb-2">
            {dailyVentes.map((d) => {
              const h = maxDailyAmount > 0 ? (d.amount / maxDailyAmount) * 100 : 0
              return (
                <div
                  key={d.date}
                  className="flex-1 min-w-[12px] flex flex-col items-center justify-end h-full group relative"
                >
                  <div
                    className="w-full bg-gradient-to-t from-[var(--color-primary)] to-orange-400 rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${Math.max(4, h)}%` }}
                  />
                  <div className="absolute bottom-full mb-2 bg-[var(--color-text)] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {formatDateShort(d.date)} — {formatCurrency(d.amount)} ({d.quantity} cal.)
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {dailyVentes.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
            <span>{formatDateShort(dailyVentes[0].date)}</span>
            <span>{formatDateShort(dailyVentes[dailyVentes.length - 1].date)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classement amicalistes */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
          <div className="p-5 border-b border-[var(--color-border)]">
            <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--color-primary)]" />
              Classement amicalistes
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Les meilleurs contributeurs de la campagne
            </p>
          </div>
          {amicalisteStats.length === 0 ? (
            <p className="p-6 text-xs text-[var(--color-text-muted)] italic text-center">
              Aucune vente enregistrée.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
              {amicalisteStats.map((s, idx) => (
                <li key={s.amicaliste_id} className="p-3 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : idx === 1
                        ? 'bg-gray-200 text-gray-700'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-sm font-bold flex-shrink-0">
                    {s.first_name?.[0]}
                    {s.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {s.grade ? `${s.grade} • ` : ''}
                      {s.ventes_count} vente{s.ventes_count > 1 ? 's' : ''} • {s.secteurs_count}{' '}
                      secteur{s.secteurs_count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">
                      {formatCurrency(s.total_amount)}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {s.total_calendriers} cal.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Classement secteurs */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
          <div className="p-5 border-b border-[var(--color-border)]">
            <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
              Secteurs les plus performants
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Progression par zone géographique
            </p>
          </div>
          {secteurStats.length === 0 ? (
            <p className="p-6 text-xs text-[var(--color-text-muted)] italic text-center">
              Aucune donnée.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
              {secteurStats.map((s) => (
                <li key={s.secteur_id} className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {s.secteur_name}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {s.ventes_count} vente{s.ventes_count > 1 ? 's' : ''} •{' '}
                        {s.total_calendriers} calendriers
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(s.total_amount)}
                      </p>
                      <p className="text-[11px] font-bold text-[var(--color-primary)]">
                        {s.progression_percent.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${s.progression_percent}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Répartition par amicaliste (donut substitute) */}
      {amicalisteStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[var(--color-primary)]" />
            Répartition des contributions
          </h2>
          <div className="flex w-full h-4 rounded-full overflow-hidden">
            {amicalisteStats.slice(0, 10).map((s, idx) => {
              const pct = totalAmount > 0 ? (s.total_amount / totalAmount) * 100 : 0
              const hue = (idx * 35) % 360
              return (
                <div
                  key={s.amicaliste_id}
                  title={`${s.first_name} ${s.last_name} — ${pct.toFixed(1)}%`}
                  style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {amicalisteStats.slice(0, 10).map((s, idx) => {
              const pct = totalAmount > 0 ? (s.total_amount / totalAmount) * 100 : 0
              const hue = (idx * 35) % 360
              return (
                <div key={s.amicaliste_id} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                  />
                  <span className="text-[var(--color-text)] font-semibold">
                    {s.first_name} {s.last_name[0]}.
                  </span>
                  <span className="text-[var(--color-text-muted)]">{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
