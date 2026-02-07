'use client'

interface Section {
  id: string
  name: string
  startTimeMs: number
  endTimeMs: number
  color?: string
}

interface SectionMarkersProps {
  sections: Section[]
  pixelsPerSecond: number
  height: number
}

const defaultColors = [
  'bg-purple-500/20 border-purple-500/50',
  'bg-blue-500/20 border-blue-500/50',
  'bg-green-500/20 border-green-500/50',
  'bg-yellow-500/20 border-yellow-500/50',
  'bg-red-500/20 border-red-500/50',
]

export function SectionMarkers({ sections, pixelsPerSecond, height }: SectionMarkersProps) {
  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height }}>
      {sections.map((section, i) => {
        const left = (section.startTimeMs / 1000) * pixelsPerSecond
        const width = ((section.endTimeMs - section.startTimeMs) / 1000) * pixelsPerSecond
        const colorClass = defaultColors[i % defaultColors.length]
        
        return (
          <div
            key={section.id}
            className={`absolute top-0 border-l border-r ${colorClass}`}
            style={{ left, width, height }}
          >
            <div className="absolute top-0 left-1 text-[10px] text-zinc-400 font-medium uppercase tracking-wide">
              {section.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
