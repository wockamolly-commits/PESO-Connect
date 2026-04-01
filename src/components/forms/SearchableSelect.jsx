import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

function SearchableSelect({ label, name, value, onChange, options, grouped = false, required, error, icon: Icon, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = grouped
    ? options.map(group => ({
        ...group,
        courses: group.courses.filter(c => c.toLowerCase().includes(search.toLowerCase()))
      })).filter(group => group.courses.length > 0)
    : options.filter(opt => {
        const label = typeof opt === 'string' ? opt : opt.label
        return label.toLowerCase().includes(search.toLowerCase())
      })

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } })
    setIsOpen(false)
    setSearch('')
  }

  const displayValue = value || ''
  const hasValue = displayValue.length > 0
  const isActive = isOpen || hasValue

  return (
    <div ref={containerRef} className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-[14px] w-5 h-5 text-gray-400 z-10" />
      )}
      <div
        onClick={() => { setIsOpen(!isOpen); setTimeout(() => inputRef.current?.focus(), 50) }}
        className={`
          w-full ${Icon ? 'pl-12' : 'pl-4'} pr-10 py-3 rounded-xl border-2 bg-white/50
          cursor-pointer transition-all duration-300 flex items-center min-h-[48px]
          ${error
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100'
            : 'border-gray-200 focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-100'
          }
        `}
      >
        {/* Only show text when there's a value — the label serves as placeholder when empty */}
        <span className={hasValue ? 'text-gray-900' : 'text-transparent select-none'}>
          {hasValue ? displayValue : '\u00A0'}
        </span>
      </div>
      <label
        className={`
          absolute transition-all duration-200 pointer-events-none
          ${isActive
            ? '-top-2.5 left-3 text-xs bg-white px-1 ' + (error ? 'text-red-500' : 'text-primary-600')
            : `top-[14px] ${Icon ? 'left-12' : 'left-4'} text-sm text-gray-400`
          }
        `}
      >
        {label}{required && ' *'}
      </label>
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleSelect('') }}
          className="absolute right-10 top-[14px] text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <ChevronDown className={`absolute right-4 top-[14px] w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />

      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error}
        </p>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden animate-scale-in">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {grouped ? (
              filteredOptions.map((group, gi) => (
                <div key={gi}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">
                    {group.category}
                  </div>
                  {group.courses.map((course, ci) => (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => handleSelect(course)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${value === course ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                    >
                      {course}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              filteredOptions.map((opt, i) => {
                const optLabel = typeof opt === 'string' ? opt : opt.label
                const optValue = typeof opt === 'string' ? opt : opt.value
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(optValue)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${value === optValue ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                  >
                    {optLabel}
                  </button>
                )
              })
            )}
            {(grouped ? filteredOptions.length === 0 : filteredOptions.length === 0) && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { SearchableSelect }
