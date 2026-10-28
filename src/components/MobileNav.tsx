const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'digest', label: 'News' },
  { id: 'notes', label: 'Notes' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'clock', label: 'Clock' },
]

// Bottom navigation for the phone layout (replaces the desktop sidebar).
export default function MobileNav({ view, onSelect }: { view: string; onSelect: (v: string) => void }) {
  return (
    <nav className="leather shrink-0 rounded-[22px] p-1.5" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => onSelect(t.id)}
            className={`flex-1 rounded-[15px] px-1 py-2.5 text-[12px] font-semibold transition-colors ${view === t.id ? 'gloss' : 'embossed'}`}>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
