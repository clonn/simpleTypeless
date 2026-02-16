import { useState, useEffect } from 'react'

interface UpdateInfo {
  event: string
  version?: string
  percent?: number
}

export function UpdateBanner(): JSX.Element | null {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    if (!window.api?.onUpdateStatus) return
    const unsubscribe = window.api.onUpdateStatus((data) => {
      setUpdateInfo(data)
    })
    return unsubscribe
  }, [])

  if (!updateInfo || updateInfo.event === 'update-not-available') return null

  if (updateInfo.event === 'update-available') {
    return (
      <div className="update-banner">
        <span>Update v{updateInfo.version} available</span>
        <button className="update-banner-btn" onClick={() => window.api?.downloadUpdate?.()}>
          Download
        </button>
        <button className="update-banner-dismiss" onClick={() => setUpdateInfo(null)}>
          {'\u2715'}
        </button>
      </div>
    )
  }

  if (updateInfo.event === 'update-download-progress') {
    return (
      <div className="update-banner">
        <span>Downloading update... {updateInfo.percent}%</span>
        <div className="update-progress">
          <div className="update-progress-fill" style={{ width: `${updateInfo.percent}%` }} />
        </div>
      </div>
    )
  }

  if (updateInfo.event === 'update-downloaded') {
    return (
      <div className="update-banner update-banner-ready">
        <span>Update ready to install</span>
        <button className="update-banner-btn" onClick={() => window.api?.installUpdate?.()}>
          Restart Now
        </button>
        <button className="update-banner-dismiss" onClick={() => setUpdateInfo(null)}>
          {'\u2715'}
        </button>
      </div>
    )
  }

  return null
}
