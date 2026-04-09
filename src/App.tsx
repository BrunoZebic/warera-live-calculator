import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import './App.css'
import { apiBaseUrl } from './api/client'
import { getRuntimeConfig } from './api/gameConfig'
import { GroupMode } from './modes/GroupMode'
import { SoloMode } from './modes/SoloMode'
import type { AppMode, RuntimeConfig } from './types'

const MODE_COPY: Record<
  AppMode,
  { title: string; label: string }
> = {
  solo: {
    label: 'Solo',
    title: 'Quick check for one player',
  },
  group: {
    label: 'Group',
    title: 'Stack a coordinated battle action',
  },
}

function getConfigStatus(config: RuntimeConfig | undefined) {
  if (!config) {
    return {
      label: 'Loading runtime config',
      toneClassName: 'status-loading',
    }
  }

  switch (config.configSource) {
    case 'live':
      return {
        label: 'Live game config loaded',
        toneClassName: 'status-live',
      }
    case 'cache':
      return {
        label: 'Cached game config in use',
        toneClassName: 'status-cache',
      }
    default:
      return {
        label: 'Fallback config in use',
        toneClassName: 'status-warn',
      }
  }
}

function getApiLabel() {
  return apiBaseUrl.includes('api2.warera.io')
    ? 'Direct WarEra API'
    : 'Custom API base'
}

function App() {
  const [mode, setMode] = useState<AppMode>('solo')
  const configQuery = useQuery({
    queryKey: ['runtime-config'],
    queryFn: getRuntimeConfig,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  })

  const activeMode = MODE_COPY[mode]
  const configStatus = getConfigStatus(configQuery.data)
  const config = configQuery.data

  return (
    <div className="app-shell">
      <section className="panel top-strip">
        <div aria-label="Calculator mode" className="mode-tabs" role="tablist">
          {(Object.keys(MODE_COPY) as AppMode[]).map((value) => (
            <button
              aria-selected={mode === value}
              className={`mode-tab ${mode === value ? 'mode-tab-active' : ''}`}
              key={value}
              onClick={() => setMode(value)}
              role="tab"
              type="button"
            >
              <span>{MODE_COPY[value].label}</span>
            </button>
          ))}
        </div>

        <div className="strip-meta">
          <strong>{activeMode.title}</strong>
          <div className="hero-meta">
            <span className={`status-pill ${configStatus.toneClassName}`}>
              {configStatus.label}
            </span>
            <span className="status-pill status-neutral">{getApiLabel()}</span>
          </div>
        </div>
      </section>

      {configQuery.isError ? (
        <section className="panel error-panel">
          Live config refresh failed. The app is still usable with cached or
          fallback values, and manual mode remains available.
        </section>
      ) : null}

      {config ? (
        mode === 'solo' ? (
          <SoloMode config={config} />
        ) : (
          <GroupMode config={config} />
        )
      ) : (
        <section className="panel empty-panel">
          Loading runtime configuration...
        </section>
      )}
    </div>
  )
}

export default App
