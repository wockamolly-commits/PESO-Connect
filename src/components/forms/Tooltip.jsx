import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

function Tooltip({ text }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => { e.preventDefault(); setIsVisible(!isVisible) }}
        className="text-gray-400 hover:text-primary-500 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg whitespace-normal w-56 z-50 animate-scale-in">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-800 rotate-45" />
        </div>
      )}
    </span>
  )
}

export { Tooltip }
