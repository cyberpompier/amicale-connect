import { useAssociation } from '@/features/association/AssociationContext'
import type { Amicaliste } from './useAmicalistes'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

  const exportToCSV = (amicalistes: Amicaliste[], status?: string) => {
    const filtered = status ? amicalistes.filter((a) => a.status === status) : amicalistes
    const data = filtered.map((a) => ({
      Prénom: a.first_name,
      Nom: a.last_name,
      Email: a.email || '',
      Téléphone: a.phone || '',
      Grade: a.grade || '',
      Statut: getStatusLabel(a.status),
      'Date adhésion': formatDate(a.join_date),
      'Date de naissance': a.birth_date ? formatDate(a.birth_date) : '',
      'Adresse': `${a.address_street || ''}, ${a.address_postal_code || ''} ${a.address_city || ''}`.trim(),
      'État civil': a.marital_status || '',
      Photo: a.avatar_url || '',
      Notes: a.notes || '',
    }))

    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `amicalistes_${status || 'tous'}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToExcel = async (amicalistes: Amicaliste[], status?: string) => {
    const filtered = status ? amicalistes.filter((a) => a.status === status) : amicalistes
    const data = filtered.map((a) => ({
      Prénom: a.first_name,
      Nom: a.last_name,
      Email: a.email || '',
      Téléphone: a.phone || '',
      Grade: a.grade || '',
      Statut: getStatusLabel(a.status),
      'Date adhésion': formatDate(a.join_date),
      'Date de naissance': a.birth_date ? formatDate(a.birth_date) : '',
      'Rue': a.address_street || '',
      'Code postal': a.address_postal_code || '',
      'Ville': a.address_city || '',
      'État civil': a.marital_status || '',
      'Lien photo': a.avatar_url || '',
      Notes: a.notes || '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Amicalistes')

    // Auto-ajuster les largeurs
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
    ]

    XLSX.writeFile(workbook, `amicalistes_${status || 'tous'}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = async (amicalistes: Amicaliste[], status?: string) => {
    const filtered = status ? amicalistes.filter((a) => a.status === status) : amicalistes

    // Créer un conteneur HTML temporaire
    const container = document.createElement('div')
    container.style.padding = '20px'
    container.style.backgroundColor = 'white'
    container.style.width = '1200px'

    // En-tête
    const header = document.createElement('div')
    header.style.marginBottom = '20px'
    header.style.borderBottom = '2px solid #333'
    header.style.paddingBottom = '10px'
    header.innerHTML = `
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Amicalistes ${currentAssociation?.name || ''}</h1>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
        Statut: ${status ? getStatusLabel(status) : 'Tous'} |
        Total: ${filtered.length} |
        Date: ${new Date().toLocaleDateString('fr-FR')}
      </p>
    `
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
    ;['Photo', 'Nom', 'Email', 'Téléphone', 'Grade', 'Statut', 'Adhésion'].forEach((col) => {
      const th = document.createElement('th')
      th.textContent = col
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

      // Photo
      const photoCell = document.createElement('td')
      photoCell.style.padding = '4px'
      if (member.avatar_url) {
        const img = document.createElement('img')
        img.src = member.avatar_url
        img.style.width = '30px'
        img.style.height = '30px'
        img.style.borderRadius = '4px'
        img.style.objectFit = 'cover'
        photoCell.appendChild(img)
      } else {
        photoCell.textContent = '—'
      }
      row.appendChild(photoCell)

      // Nom
      const nameCell = document.createElement('td')
      nameCell.textContent = `${member.first_name} ${member.last_name}`
      nameCell.style.padding = '8px'
      row.appendChild(nameCell)

      // Email
      const emailCell = document.createElement('td')
      emailCell.textContent = member.email || '—'
      emailCell.style.padding = '8px'
      row.appendChild(emailCell)

      // Téléphone
      const phoneCell = document.createElement('td')
      phoneCell.textContent = member.phone || '—'
      phoneCell.style.padding = '8px'
      row.appendChild(phoneCell)

      // Grade
      const gradeCell = document.createElement('td')
      gradeCell.textContent = member.grade || '—'
      gradeCell.style.padding = '8px'
      row.appendChild(gradeCell)

      // Statut
      const statusCell = document.createElement('td')
      statusCell.textContent = getStatusLabel(member.status)
      statusCell.style.padding = '8px'
      row.appendChild(statusCell)

      // Adhésion
      const dateCell = document.createElement('td')
      dateCell.textContent = formatDate(member.join_date)
      dateCell.style.padding = '8px'
      row.appendChild(dateCell)

      tbody.appendChild(row)
    }
    table.appendChild(tbody)
    container.appendChild(table)

    // Convertir en canvas et ajouter au PDF
    document.body.appendChild(container)
    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 280
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0
      while (heightLeft > 0) {
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
        if (heightLeft > 0) pdf.addPage()
        position = heightLeft - imgHeight
      }

      pdf.save(`amicalistes_${status || 'tous'}_${new Date().toISOString().split('T')[0]}.pdf`)
    } finally {
      document.body.removeChild(container)
    }
  }

  return {
    exportToCSV,
    exportToExcel,
    exportToPDF,
  }
}
