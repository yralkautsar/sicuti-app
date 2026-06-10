'use client'

// Reusable empty state component
export default function EmptyState({
  icon = null,
  title = 'Belum ada data',
  description = 'Mulai dengan menambahkan data baru.',
  actionLabel = '+ Tambah',
  onAction = null,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      {/* Icon */}
      {icon && (
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="font-bold text-lg mb-2" style={{ color: '#442F78' }}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm mb-6 max-w-xs text-center" style={{ color: '#78716C' }}>
        {description}
      </p>

      {/* CTA Button */}
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: '#A78BFA',
            '&:hover': { background: '#8B5CF6' }
          }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
