import { useEffect, useState } from 'react'

/** Keep responsive disclosures separate from the user's desktop preferences. */
export function useNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(() =>
    window.matchMedia?.('(max-width: 600px)').matches ?? false,
  )

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 600px)')
    if (!media) return
    const update = () => setNarrow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return narrow
}
