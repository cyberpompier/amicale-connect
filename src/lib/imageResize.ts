/**
 * Redimensionne une image côté client via Canvas avant upload.
 * @param file     Fichier image source
 * @param maxSize  Taille max (largeur ET hauteur) en pixels — défaut 600
 * @param quality  Qualité JPEG 0-1 — défaut 0.82
 */
export async function resizeImage(
  file: File,
  maxSize = 600,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width <= maxSize && height <= maxSize) {
        // Déjà assez petite — on renvoie telle quelle
        resolve(file)
        return
      }

      if (width > height) {
        height = Math.round((height * maxSize) / width)
        width = maxSize
      } else {
        width = Math.round((width * maxSize) / height)
        height = maxSize
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Échec du redimensionnement')); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image invalide')) }
    img.src = url
  })
}
