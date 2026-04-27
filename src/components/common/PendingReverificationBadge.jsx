const PendingReverificationBadge = ({ className = '', variant = 'default' }) => {
    const isDotOnly = variant === 'compact'
    const dotSize = isDotOnly ? 'h-2.5 w-2.5' : 'h-2 w-2'
    const tooltipOffset = isDotOnly ? 'top-5' : 'top-6'

    return (
        <span
            title={isDotOnly ? undefined : "This user's profile has recent changes under review by PESO staff."}
            className={`group relative inline-flex items-center ${className}`.trim()}
        >
            {!isDotOnly && (
                <span
                    aria-label="Pending reverification"
                    className="badge bg-amber-100 text-amber-800"
                >
                    Pending reverification
                </span>
            )}
            {isDotOnly && (
                <>
                    <span
                        aria-label="Pending reverification"
                        className={`inline-flex ${dotSize} rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.16),0_0_12px_rgba(251,191,36,0.55)]`}
                    />
                    <span
                        role="tooltip"
                        className={`pointer-events-none absolute left-1/2 ${tooltipOffset} z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100`}
                    >
                        Pending reverification
                    </span>
                </>
            )}
        </span>
    )
}

export default PendingReverificationBadge
