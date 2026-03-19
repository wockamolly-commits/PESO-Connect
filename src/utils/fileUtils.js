/**
 * Compress images (resize + JPEG encode) or read non-image files as Base64 data URLs.
 * Used for certificate files that are still stored as Base64.
 */
export const compressAndEncode = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) return resolve('')

        if (!file.type.startsWith('image/')) {
            if (file.size > 400 * 1024) {
                return reject(new Error('PDF must be under 400KB.'))
            }
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = (err) => reject(err)
            reader.readAsDataURL(file)
            return
        }

        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)
            const MAX_DIM = 800
            let { width, height } = img

            if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                    height = Math.round(height * (MAX_DIM / width))
                    width = MAX_DIM
                } else {
                    width = Math.round(width * (MAX_DIM / height))
                    height = MAX_DIM
                }
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
            resolve(dataUrl)
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load image for compression.'))
        }

        img.src = url
    })
}
