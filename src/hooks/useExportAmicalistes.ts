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
    const filtered = status ? amicalistes.filter((a) => a.status === status) : amicalistes

    // Pré-charger toutes les images en base64 (contourne CORS html2canvas)
    const avatarMap = new Map<string, string>()
    await Promise.all(
      filtered
        .filter((m) => m.avatar_url)
        .map(async (m) => {
          const b64 = await toBase64(m.avatar_url!)
          if (b64) avatarMap.set(m.avatar_url!, b64)
        })
    )

    // Pré-charger le logo
    let logoBase64: string | null = null
    if (currentAssociation?.logo_url) {
      logoBase64 = await toBase64(currentAssociation.logo_url)
    }

    // Créer un conteneur HTML temporaire
    const container = document.createElement('div')
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.width = '1200px'

    // En-tête avec logo
    const header = document.createElement('div')
    header.style.marginBottom = '20px'
    header.style.borderBottom = '2px solid #333'
    header.style.paddingBottom = '10px'
    header.style.display = 'flex'
    header.style.alignItems = 'center'
    header.style.gap = '15px'

    if (logoBase64) {
      const logo = document.createElement('img')
      logo.src = logoBase64
      logo.style.width = '60px'
      logo.style.height = '60px'
      logo.style.objectFit = 'contain'
      header.appendChild(logo)
    }

    const headerText = document.createElement('div')
    headerText.innerHTML = `
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${currentAssociation?.name || 'Amicalistes'}</h1>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
        Statut: ${status ? getStatusLabel(status) : 'Tous'} |
        Total: ${filtered.length} |
        Date: ${new Date().toLocaleDateString('fr-FR')}
      </p>
    `
    header.appendChild(headerText)
    container.appendChild(header)

    // Tableau
    const table = document.createElement('table')
    table.style.width = '100%'
    table.style.borderCollapse = 'collapse'
    table.style.fontSize = '11px'

    // En-têtes du tableau
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    headerRow.style.backgroundColor = '#f0f0f0'
    headerRow.style.borderBottom = '1px solid #ddd'

    columns.forEach((col) => {
      const th = document.createElement('th')
      th.textContent = EXPORT_COLUMNS[col]
      th.style.padding = '8px'
      th.style.textAlign = 'left'
      th.style.fontWeight = 'bold'
      th.style.borderBottom = '1px solid #ddd'
      headerRow.appendChild(th)
    })

    thead.appendChild(headerRow)
    table.appendChild(thead)

    // Corps du tableau
    const tbody = document.createElement('tbody')
    for (const member of filtered) {
      const row = document.createElement('tr')
      row.style.borderBottom = '1px solid #eee'

      columns.forEach((col) => {
        const cell = document.createElement('td')
        cell.style.padding = '4px'
        cell.style.wordWrap = 'break-word'

        if (col === 'photo') {
          if (member.avatar_url) {
            const src = avatarMap.get(member.avatar_url) ?? member.avatar_url
            const img = document.createElement('img')
            img.src = src
            img.style.width = '36px'
            img.style.height = '36px'
            img.style.borderRadius = '6px'
            img.style.objectFit = 'cover'
            img.style.display = 'block'
            cell.appendChild(img)
          } else {
            const initials = document.createElement('div')
            initials.textContent = `${member.first_name[0]}${member.last_name[0]}`
            initials.style.width = '36px'
            initials.style.height = '36px'
            initials.style.borderRadius = '6px'
            initials.style.backgroundColor = '#fee2e2'
            initials.style.color = '#dc2626'
            initials.style.display = 'flex'
            initials.style.alignItems = 'center'
            initials.style.justifyContent = 'center'
            initials.style.fontWeight = 'bold'
            initials.style.fontSize = '12px'
            cell.appendChild(initials)
          }
        } else {
          cell.textContent = (buildRowData(member, [col])[EXPORT_COLUMNS[col]] || '—').toString()
        }

        row.appendChild(cell)
      })

      tbody.appendChild(row)
    }

    table.appendChild(tbody)
    container.appendChild(table)

    // Rendre en PDF via html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'l',
      unit: 'mm',
      format: 'a4',
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = (canvas.height * pdfWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
    heightLeft -= pdfHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    pdf.save(`amicalistes_${status || 'tous'}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return { exportToCSV, exportToExcel, exportToPDF }
}
