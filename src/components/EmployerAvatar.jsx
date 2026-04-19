import { useEffect, useState } from 'react'
import { getEmployerDisplayName, getEmployerImageUrl } from '../utils/employerBranding'

const EmployerAvatar = ({
  job,
  className = '',
  textClassName = '',
  fallbackClassName = '',
  alt,
}) => {
  const imageUrl = getEmployerImageUrl(job)
  const employerName = getEmployerDisplayName(job)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  // Guard both "employerName is missing entirely" (null/undefined from a
  // branding helper that returned nothing) and "empty string" cases so
  // the avatar always has a fallback glyph.
  const initial = (employerName?.charAt(0) || 'E').toUpperCase()
  const sharedClassName = className.trim()

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={alt || `${employerName} logo`}
        className={`${sharedClassName} object-cover`}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div
      className={`${sharedClassName} ${fallbackClassName}`.trim()}
      aria-label={alt || `${employerName} placeholder logo`}
    >
      <span className={textClassName}>{initial}</span>
    </div>
  )
}

export default EmployerAvatar
