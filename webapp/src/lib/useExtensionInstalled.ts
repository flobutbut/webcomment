import { useState, useEffect } from 'react'

export function useExtensionInstalled(): boolean | null {
  const [installed, setInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    // Content script runs at document_idle — give it ~600ms to inject before concluding
    const t = window.setTimeout(() => {
      setInstalled(document.documentElement.hasAttribute('data-webcomment-installed'))
    }, 600)
    return () => clearTimeout(t)
  }, [])

  return installed
}
