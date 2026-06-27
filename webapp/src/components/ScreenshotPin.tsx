import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface ScreenshotPinProps {
  url:  string
  pinX: number
  pinY: number
  size?: 'sm' | 'md'
}

export function ScreenshotPin({ url, pinX, pinY, size = 'md' }: ScreenshotPinProps) {
  const [err, setErr] = useState(false)

  const sm = size === 'sm'
  const dims = {
    wrapper: sm ? 'w-12 h-8'   : 'w-14 h-10',
    img:     sm ? 'w-12 h-8'   : 'w-14 h-10',
    pin:     sm ? 'w-2 h-2'    : 'w-2.5 h-2.5',
  }

  return (
    <div className={`relative ${dims.wrapper} flex-shrink-0`}>
      {err ? (
        <div className={`${dims.img} bg-gray-50 dark:bg-dark-700 rounded-6 border border-gray-200 dark:border-dark-border flex items-center justify-center`}>
          <ImageOff className="w-3 h-3 text-gray-300 dark:text-gray-600" />
        </div>
      ) : (
        <>
          <img
            src={url}
            className={`${dims.img} object-cover rounded-6 border border-gray-200 dark:border-dark-border`}
            alt=""
            onError={() => setErr(true)}
          />
          <div
            className={`absolute ${dims.pin} rounded-full bg-blue-600 border border-white shadow-sm`}
            style={{ left: `${pinX}%`, top: `${pinY}%`, transform: 'translate(-50%,-50%)' }}
          />
        </>
      )}
    </div>
  )
}
