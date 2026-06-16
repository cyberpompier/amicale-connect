import { useState, useEffect } from 'react'
import { Box, Check, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { supabase } from '@/lib/supabase'

const PRINTFUL_API_KEY = 'printful_api_key'

interface SyncResult {
  total: number
  imported: number
  updated: number
  errors: string[]
}

export function PrintfulSettingsCard({ onSynced }: { onSynced?: () => void }) {
  const { settings, loading, updateSetting } = usePlatformSettings()
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    setApiKey(settings[PRINTFUL_API_KEY] ?? '')
  }, [settings])

  const isConfigured = !!settings[PRINTFUL_API_KEY]

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateSetting(PRINTFUL_API_KEY, apiKey.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    setSyncResult(null)
    try {
      const { data, error } = await supabase.functions.invoke<SyncResult>('printful-sync-products', {
        method: 'POST',
      })
      if (error) throw error
      setSyncResult(data)
      onSynced?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSyncError(`Échec de la synchronisation : ${message}`)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Box className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--color-text)] text-sm">Connexion Printful</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Clé API utilisée pour synchroniser le catalogue et envoyer les commandes à Printful
          </p>
        </div>
        {isConfigured && (
          <span className="ml-auto flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            <Check className="w-3 h-3" />
            Configurée
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Clé API Printful"
            className="w-full px-3 py-2 pr-10 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || apiKey.trim() === (settings[PRINTFUL_API_KEY] ?? '')}
          className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {saved ? 'Enregistré ✓' : saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-2">
        Récupérez votre clé dans Printful : Tableau de bord → Paramètres → Stores → API
      </p>

      {isConfigured && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation…' : 'Synchroniser le catalogue Printful'}
          </button>

          {syncResult && (
            <div className="mt-3 text-xs text-[var(--color-text-muted)]">
              <p>
                {syncResult.total} produit(s) Printful · {syncResult.imported} importé(s) ·{' '}
                {syncResult.updated} mis à jour
              </p>
              {syncResult.imported > 0 && (
                <p className="mt-1 text-amber-700">
                  Les nouveaux produits sont importés en statut « Inactif » — vérifiez le prix, la
                  commission et la catégorie avant de les activer.
                </p>
              )}
              {syncResult.errors.length > 0 && (
                <ul className="mt-1 text-red-600 list-disc list-inside">
                  {syncResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {syncError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mt-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{syncError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
