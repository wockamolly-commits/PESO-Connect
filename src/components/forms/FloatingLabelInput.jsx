import { useState } from 'react'

function FloatingLabelInput({ label, name, value, onChange, type = 'text', icon: Icon, required, error, helpTooltip, ...props }) {
  const [focused, setFocused] = useState(false)
  const isActive = focused || (value && value.length > 0) || type === 'date'

  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        className={`
          w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3 rounded-xl border-2 bg-white/50
          outline-none transition-all duration-300 placeholder-transparent peer
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
          ${Icon ? 'left-12' : 'left-4'}
          ${isActive
            ? '-top-2.5 left-3 text-xs bg-white px-1 translate-y-0 ' + (error ? 'text-red-500' : 'text-primary-600')
            : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
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
      {!error && value && value.length > 0 && !focused && (
        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  )
}

export { FloatingLabelInput }
