import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const Select = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  icon: Icon = null,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const listboxRef = useRef(null)
  const typeAheadRef = useRef('')
  const typeAheadTimerRef = useRef(null)
  const id = useId()
  const listboxId = `select-listbox${id}`

  const selectedOption = options.find((opt) => opt.value === value)
  const selectedIndex = options.findIndex((opt) => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const option = listboxRef.current.querySelector(`[data-index="${highlightedIndex}"]`)
      if (option) {
        option.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [isOpen, highlightedIndex])

  const openDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen(true)
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [disabled, selectedIndex])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  const selectOption = useCallback(
    (optionValue) => {
      onChange(optionValue)
      closeDropdown()
    },
    [onChange, closeDropdown]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return

      if (!isOpen) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault()
          openDropdown()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev + 1) % options.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            selectOption(options[highlightedIndex].value)
          }
          break
        case 'Escape':
          e.preventDefault()
          closeDropdown()
          break
        default:
          // Type-ahead: single printable character
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            typeAheadRef.current += e.key.toLowerCase()

            clearTimeout(typeAheadTimerRef.current)
            typeAheadTimerRef.current = setTimeout(() => {
              typeAheadRef.current = ''
            }, 500)

            const query = typeAheadRef.current
            const matchIndex = options.findIndex((opt) =>
              (opt.label ?? '').toLowerCase().startsWith(query)
            )
            if (matchIndex >= 0) {
              setHighlightedIndex(matchIndex)
            }
          }
          break
      }
    },
    [isOpen, disabled, options, highlightedIndex, openDropdown, closeDropdown, selectOption]
  )

  // Clean up type-ahead timer on unmount
  useEffect(() => {
    return () => clearTimeout(typeAheadTimerRef.current)
  }, [])

  const getOptionId = (index) => `${listboxId}-option-${index}`

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined}
        disabled={disabled}
        aria-label={placeholder}
        onClick={() => {
          if (disabled) return
          isOpen ? closeDropdown() : openDropdown()
        }}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-3
          bg-white/50 backdrop-blur-sm border-2 rounded-xl font-medium
          transition-all duration-300 text-left outline-none
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : isOpen
              ? 'border-primary-400 ring-4 ring-primary-100 shadow-lg'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'
          }
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />}
          {selectedOption?.icon && (() => {
            const OptionIcon = selectedOption.icon
            return <OptionIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
          })()}
          <span className={`truncate ${selectedOption ? 'text-gray-700' : 'text-gray-400'}`}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={placeholder}
          className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-white/50 max-h-60 overflow-auto animate-scale-in"
        >
          {options.map((option, index) => {
            const isSelected = value === option.value
            const isHighlighted = highlightedIndex === index
            const OptionIcon = option.icon

            return (
              <li
                key={option.value}
                id={getOptionId(index)}
                role="option"
                aria-selected={isSelected}
                data-index={index}
                onClick={() => selectOption(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  flex items-center justify-between gap-3 px-4 py-3
                  transition-colors duration-150 cursor-pointer
                  ${isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}
                  ${isHighlighted && !isSelected ? 'bg-gray-50' : ''}
                  ${index !== options.length - 1 ? 'border-b border-gray-100' : ''}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {OptionIcon && (
                    <OptionIcon
                      className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`}
                    />
                  )}
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{option.label}</span>
                    {option.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Select
