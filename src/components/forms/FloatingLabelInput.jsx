import { useState, useRef } from 'react'

function FloatingLabelInput({ label, name, value, onChange, type = 'text', icon: Icon, required, error, helpTooltip, onBlur: parentOnBlur, ...props }) {
  const [focused, setFocused] = useState(false)
  const isActive = focused || (value && String(value).length > 0) || type === 'date'
  const inputRef = useRef(null)

  return (
    <div className="relative">
      {Icon && (
        <Icon
          className={`absolute left-4 top-[14px] w-5 h-5 text-gray-400 z-10 ${type === 'date' ? 'cursor-pointer' : ''}`}
          onClick={type === 'date' ? () => inputRef.current?.showPicker?.() : undefined}
        />
      )}
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { setFocused(false); parentOnBlur?.(e) }}
        placeholder=" "
        className={`
          w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3 rounded-xl border-2 bg-white/50
          outline-none transition-all duration-300 placeholder-transparent peer min-h-[48px]
          [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden
          ${error
            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
            : 'border-gray-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100'
          }
        `}
        {...props}
      />
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
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error}
        </p>
      )}
      {!error && value && String(value).length > 0 && !focused && (
        <svg className="absolute right-4 top-[14px] w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  )
}

export { FloatingLabelInput }
