import { useAssociation } from '@/features/association/AssociationContext'
import type { Amicaliste } from './useAmicalistes'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export type ExportColumn = 'photo' | 'nom' | 'prenom' | 'email' | 'telephone' | 'grade' | 'statut' | 'adhesion' | 'naissance' | 'adresse' | 'etat_civil' | 'notes'

export const EXPORT_COLUMNS: Record<ExportColumn, string> = {
  photo: 'Photo',
  nom: 'Nom',
  prenom: 'Prénom',
  email: 'Email',
  telephone: 'Téléphone',
  grade: 'Grade',
  statut: 'Statut',
  adhesion: 'Date adhésion',
  naissance: 'Date de naissance',
  adresse: 'Adresse',
  etat_civil: 'État civil',
  notes: 'Notes',
}

export function useExportAmicalistes() {
  const { currentAssociation } = useAssociation()

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      actif: 'Actif',
      inactif: 'Inactif',
      honoraire: 'Honoraire',
    }
    return labels[status] || status
  }

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const buildRowData = (amicaliste: Amicaliste, columns: ExportColumn[]) => {
    const row: Record<string, string> = {}

    columns.forEach((col) => {
      switch (col) {
        case 'photo':
          row['Photo'] = amicaliste.avatar_url || ''
          break
        case 'nom':
          row['Nom'] = amicaliste.last_name
          break
        case 'prenom':
          row['Prénom'] = amicaliste.first_name
          break
        case 'email':
          row['Email'] = amicaliste.email || ''
          break
        case 'telephone':
          row['Téléphone'] = amicaliste.phone || ''
          break
        case 'grade':
          row['Grade'] = amicaliste.grade || ''
          break
        case 'statut':
          row['Statut'] = getStatusLabel(amicaliste.status)
          break
        case 'adhesion':
          row['Date adhésion'] = formatDate(amicaliste.join_date)
          break
        case 'naissance':
          row['Date de naissance'] = amicaliste.birth_date ? formatDate(amicaliste.birth_date) : ''
          break
        case 'adresse':
          row['Adresse'] = `${amicaliste.address_street || ''}, ${amicaliste.address_postal_code || ''} ${amicaliste.address_city || ''}`.trim()
          break
        case 'etat_civil':
          row['État civil'] = amicaliste.marital_status || ''
          break
        case 'notes':
          row['Notes'] = amicaliste.notes || ''
          break
      }
    })

    return row
  }

  const exportToCSV = (amicalistes: Amicaliste[], columns: ExportColumn[], status?: string) => {
    const filtered = status ? amicalistes.filter((a) => a.status === status) : amicalistes
    const data = filtered.map((a) => buildRowData(a, columns))

    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `amicalistes_${status || 'tous'}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const truncate = (text: string | null | undefined, max: number = 32000): string => {
    if (!text) return ''
    return text.length > max ? text.slice(0, max - 3) + '...' : text
  }

  const exportToExcel = async (amicalistes: Amicaliste[], columns: ExportColumn[], status?: string) => {
    const filtered = status ? amicalistes.filter((a) => a.status === status) : amicalistes

    // Construire les données avec colonnes filtrées
    const data = filtered.map((a) => {
      const row: Record<string, string> = {}

      columns.forEach((col) => {
        const header = EXPORT_COLUMNS[col]
        let value = ''

        switch (col) {
          case 'nom':
            value = truncate(a.last_name, 100)
            break
          case 'prenom':
            value = truncate(a.first_name, 100)
            break
          case 'email':
            value = truncate(a.email || '', 100)
            break
          case 'telephone':
            value = truncate(a.phone || '', 20)
            break
          case 'grade':
            value = truncate(a.grade || '', 50)
            break
          case 'statut':
            value = getStatusLabel(a.status)
            break
          case 'adhesion':
            value = formatDate(a.join_date)
            break
          case 'naissance':
            value = a.birth_date ? formatDate(a.birth_date) : ''
            break
          case 'adresse':
            value = truncate(`${a.address_street || ''}, ${a.address_postal_code || ''} ${a.address_city || ''}`.trim(), 200)
            break
          case 'etat_civil':
            value = truncate(a.marital_status || '', 50)
            break
          case 'notes':
            value = truncate(a.notes || '', 1000)
            break
          case 'photo':
            value = truncate(a.avatar_url || '', 1000)
            break
        }

        row[header] = value
      })

      return row
    })

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet.A1.s = { bold: true, fill: { fgColor: { rgb: 'FFF2E6' } } }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Amicalistes')

    // Ajuster les largeurs de colonnes
    const colWidths = columns.map(() => ({ wch: 15 }))
    worksheet['!cols'] = colWidths

    XLSX.writeFile(workbook, `amicalistes_${status || 'tous'}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Convertit une URL d'image en base64 pour contourner CORS dans html2canvas
  const toBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const exportToPDF = async (amicalistes: Amicaliste[], columns: ExportColumn[], status?: string) => {
    try {
      const filtered = status ? amicalistes.filter((a) => a.status === status) : amicalistes

      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      let currentY = margin

      // Ajouter le logo et le titre
      let logoSize = 0
      if (currentAssociation?.logo_url) {
        try {
          const logoBase64 = await toBase64(currentAssociation.logo_url)
          if (logoBase64) {
            logoSize = 15
            pdf.addImage(logoBase64, 'JPEG', margin, currentY, logoSize, logoSize)
          }
        } catch (e) {
          console.warn('Logo non chargé:', e)
        }
      }

      // Titre
      pdf.setFontSize(14)
      pdf.setFont(undefined, 'bold')
      pdf.text(currentAssociation?.name || 'Amicalistes', margin + logoSize + 5, currentY + 5)

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      const infoText = `Statut: ${status ? getStatusLabel(status) : 'Tous'} | Total: ${filtered.length} | Date: ${new Date().toLocaleDateString('fr-FR')}`
      pdf.text(infoText, margin + logoSize + 5, currentY + 12)

      currentY = Math.max(currentY + 20, logoSize + margin + 5)

      // Ajouter le tableau avec les données
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'bold')

      const colWidth = (pageWidth - 2 * margin) / columns.length
      const maxCellHeight = 8

      // En-têtes
      columns.forEach((col) => {
        const x = margin + columns.indexOf(col) * colWidth
        pdf.rect(x, currentY, colWidth, maxCellHeight)
        pdf.text(EXPORT_COLUMNS[col], x + 2, currentY + 5, { maxWidth: colWidth - 4 })
      })

      pdf.setFont(undefined, 'normal')
      currentY += maxCellHeight

      // Données
      for (const member of filtered) {
        // Vérifier si on doit créer une nouvelle page
        if (currentY + maxCellHeight > pageHeight - margin) {
          pdf.addPage()
          currentY = margin
        }

        columns.forEach((col) => {
          const x = margin + columns.indexOf(col) * colWidth

          if (col === 'photo') {
            if (member.avatar_url) {
              try {
                const avatarBase64 = await toBase64(member.avatar_url)
                if (avatarBase64) {
                  pdf.addImage(avatarBase64, 'JPEG', x + 1, currentY, 6, 6)
                }
              } catch (e) {
                console.warn('Avatar non chargé:', e)
              }
            }
          } else {
            const value = buildRowData(member, [col])[EXPORT_COLUMNS[col]] || ''
            const truncated = truncate(value, 100)
            pdf.text(truncated, x + 2, currentY + 5, { maxWidth: colWidth - 4 })
          }

          pdf.rect(x, currentY, colWidth, maxCellHeight)
        })

        currentY += maxCellHeight
      }

      pdf.save(`amicalistes_${status || 'tous'}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      throw error
    }
  }

  return { exportToCSV, exportToExcel, exportToPDF }
}
