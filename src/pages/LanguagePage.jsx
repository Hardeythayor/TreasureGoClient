import { useState } from 'react'
import { Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const languages = [
  { flag: '🇺🇸', name: 'English (US)' },
  { flag: '🇬🇧', name: 'English (UK)' },
  { flag: '🇫🇷', name: 'Français' },
  { flag: '🇪🇸', name: 'Español' },
  { flag: '🇳🇬', name: 'Yoruba' },
  { flag: '🇩🇪', name: 'Deutsch' },
  { flag: '🇧🇷', name: 'Português' },
  { flag: '🇸🇦', name: 'العربية' },
]

function LanguagePage() {
  const [selected, setSelected] = useState('English (US)')

  return (
    <div>
      <div className="mx-auto max-w-xl p-6">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground">
          <Search className="size-3.5" />
          Search languages…
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {languages.map(({ flag, name }) => (
            <button
              key={name}
              type="button"
              onClick={() => setSelected(name)}
              className={cn(
                'flex items-center justify-between border-b border-border px-1 py-2.5 text-left text-sm',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-lg">{flag}</span>
                {name}
              </span>
              {selected === name && <Check className="size-4 text-gold" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LanguagePage
