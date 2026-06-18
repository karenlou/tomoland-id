'use client'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search citizens..."
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-body)',
          color: 'var(--color-ink)',
          background: 'transparent',
          border: '1.5px solid var(--color-border)',
          borderRadius: 0,
          padding: '8px 36px 8px 12px',
          width: '100%',
          maxWidth: '100%',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        aria-hidden
      >
        <circle cx="6.5" cy="6.5" r="5" stroke="#2C2511" strokeWidth="1.5" />
        <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="#2C2511" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}
