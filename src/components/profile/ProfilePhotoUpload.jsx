import { useRef } from 'react'
import { Camera } from 'lucide-react'

const ProfilePhotoUpload = ({ name, currentPhoto, onPhotoChange, size = 'lg' }) => {
    const fileInputRef = useRef(null)

    const sizeClasses = size === 'lg'
        ? 'w-24 h-24 text-3xl'
        : 'w-16 h-16 text-xl'

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5MB')
            return
        }

        // Compress to 200x200
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)
            const canvas = document.createElement('canvas')
            canvas.width = 200
            canvas.height = 200
            const ctx = canvas.getContext('2d')

            // Center-crop: use the smaller dimension as the crop square
            const minDim = Math.min(img.width, img.height)
            const sx = (img.width - minDim) / 2
            const sy = (img.height - minDim) / 2

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 200, 200)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
            onPhotoChange(dataUrl)
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            alert('Failed to load image')
        }

        img.src = url
    }

    const initial = name?.charAt(0)?.toUpperCase() || '?'

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
            >
                {currentPhoto ? (
                    <img
                        src={currentPhoto}
                        alt="Profile photo"
                        className={`${sizeClasses} rounded-full object-cover shadow-lg`}
                    />
                ) : (
                    <div className={`${sizeClasses} bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                        {initial}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                </div>
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="hidden"
            />
            <p className="text-xs text-gray-400 mt-2">Click to change photo</p>
        </div>
    )
}

export default ProfilePhotoUpload
