import { useState, useEffect, useRef } from 'react'

export default function SpieltagNav({ current, total, doneSet, onChange, info }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <>
      <div className="st-bar">
        <div className={`st-side${current === 0 ? ' disabled' : ''}`} onClick={() => current > 0 && onChange(current - 1)}>
          {current > 0 ? `← Spieltag ${current}` : ''}
        </div>
        <div className="st-center" ref={ref} onClick={() => setOpen(o => !o)}>
          <span className="st-title">Spieltag {current + 1}</span>
          <span className="st-arrow">▾</span>
          {open && (
            <div className="st-dropdown">
              {Array.from({ length: total }, (_, i) => (
                <div key={i}
                  className={`st-item${i === current ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); onChange(i); setOpen(false) }}>
                  Spieltag {i + 1}
                  {doneSet.has(i) && <span className="st-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`st-side next${current === total - 1 ? ' disabled' : ''}`} onClick={() => current < total - 1 && onChange(current + 1)}>
          {current < total - 1 ? `Spieltag ${current + 2} →` : ''}
        </div>
        {info && <div className="st-info">{info}</div>}
      </div>
    </>
  )
}
