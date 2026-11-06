// ---------------------------------------------------------------------------
// imageUtils.js — kompres gambar di browser sebelum diupload.
// Gambar dikecilkan (sisi terpanjang maks `maxSize` px) dan diubah ke JPEG,
// supaya ukuran file kecil dan hemat database / bandwidth.
// ---------------------------------------------------------------------------

export const compressImage = (file, maxSize = 1000, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
  
      img.onload = () => {
        URL.revokeObjectURL(url)
  
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
  
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff' // PNG transparan -> latar putih
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengompres gambar.'))
              return
            }
            const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
            resolve(new File([blob], name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          quality,
        )
      }
  
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('File gambar tidak bisa dibaca.'))
      }
  
      img.src = url
    })