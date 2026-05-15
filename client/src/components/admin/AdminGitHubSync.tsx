/**
 * ADMIN GITHUB SYNC - Panel de sincronización de propiedades desde GitHub
 */

import { useState } from 'react';
import { GitBranch, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

export default function AdminGitHubSync() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Queries
  const validateToken = trpc.github.validateToken.useQuery(undefined, {
    retry: false,
  });

  const setupCatalog = trpc.github.setupCatalogRepo.useQuery(undefined, {
    retry: false,
  });

  const listRepos = trpc.github.listPropertyRepos.useQuery(undefined, {
    retry: false,
  });

  const syncStatus = trpc.github.getSyncStatus.useQuery(undefined, {
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });

  // Mutations
  const syncMutation = trpc.github.syncPropertiesFromGitHub.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      setSyncing(false);
      // Refrescar estado de sincronización
      syncStatus.refetch();
    },
    onError: (error) => {
      setSyncResult({
        success: false,
        error: error.message,
      });
      setSyncing(false);
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      await syncMutation.mutateAsync({});
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <GitBranch className="w-8 h-8 text-zinc-500" />
          <h2 className="text-3xl font-bold text-white">Sincronización de GitHub</h2>
        </div>
        <p className="text-gray-400">
          Sincroniza automáticamente tus propiedades desde los repositorios de GitHub
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Token Status */}
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-white font-semibold">Token de GitHub</h3>
            {validateToken.isLoading ? (
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            ) : validateToken.data?.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          {validateToken.data?.user && (
            <div className="text-sm text-gray-300 space-y-1">
              <p>
                <span className="text-zinc-500">Usuario:</span> {validateToken.data.user.login}
              </p>
              <p>
                <span className="text-zinc-500">Nombre:</span> {validateToken.data.user.name}
              </p>
            </div>
          )}
          {validateToken.error && (
            <p className="text-red-400 text-sm">{validateToken.error.message}</p>
          )}
        </div>

        {/* Catalog Repository */}
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-white font-semibold">Repositorio Centralizado</h3>
            {setupCatalog.isLoading ? (
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            ) : setupCatalog.data?.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          {setupCatalog.data?.repository && (
            <div className="text-sm text-gray-300 space-y-1">
              <p>
                <span className="text-zinc-500">Nombre:</span> {setupCatalog.data.repository.name}
              </p>
              <a
                href={setupCatalog.data.repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-500 truncate block"
              >
                {setupCatalog.data.repository.url}
              </a>
            </div>
          )}
        </div>

        {/* Sync Status */}
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-white font-semibold">Estado de Sincronización</h3>
            {syncStatus.isLoading ? (
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          {syncStatus.data && (
            <div className="text-sm text-gray-300 space-y-1">
              <p>
                <span className="text-zinc-500">Total:</span> {syncStatus.data.totalProperties}{' '}
                propiedades
              </p>
              <p>
                <span className="text-zinc-500">GitHub:</span> {syncStatus.data.syncedFromGitHub}{' '}
                sincronizadas
              </p>
              {syncStatus.data.lastSyncTime && (
                <p>
                  <span className="text-zinc-500">Última sync:</span>{' '}
                  {new Date(syncStatus.data.lastSyncTime).toLocaleString('es-CO')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Repositories List */}
      {listRepos.data?.repositories && (
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">
            Repositorios Detectados ({listRepos.data.repositories.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {listRepos.data.repositories.map((repo: any) => (
              <div
                key={repo.name}
                className="bg-black/50 border border-white/10 rounded p-3 text-sm"
              >
                <p className="text-zinc-500 font-semibold truncate">{repo.name}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{repo.description}</p>
                <p className="text-gray-500 text-xs mt-2">
                  Actualizado: {new Date(repo.updatedAt).toLocaleDateString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Button */}
      <div className="flex gap-4">
        <Button
          onClick={handleSync}
          disabled={syncing || !validateToken.data?.success}
          className="bg-zinc-900 hover:bg-zinc-900 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sincronizar Ahora
            </>
          )}
        </Button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div
          className={`rounded-lg p-6 border ${
            syncResult.success
              ? 'bg-green-900/20 border-green-700/50'
              : 'bg-red-900/20 border-red-700/50'
          }`}
        >
          <div className="flex items-start gap-3">
            {syncResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h4
                className={`font-semibold mb-2 ${
                  syncResult.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {syncResult.success ? '✅ Sincronización Exitosa' : '❌ Error en Sincronización'}
              </h4>

              {syncResult.success && (
                <div className="text-sm text-gray-300 space-y-2">
                  <p>
                    <span className="text-green-400">Propiedades sincronizadas:</span>{' '}
                    {syncResult.syncedCount}
                  </p>

                  {syncResult.syncedProperties && syncResult.syncedProperties.length > 0 && (
                    <div className="mt-3">
                      <p className="text-green-400 font-semibold mb-2">Propiedades:</p>
                      <ul className="space-y-1 ml-4">
                        {syncResult.syncedProperties.map((prop: any, idx: number) => (
                          <li key={idx} className="text-gray-300">
                            • {prop.name} ({prop.repository})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-yellow-400 font-semibold mb-2">Errores:</p>
                      <ul className="space-y-1 ml-4">
                        {syncResult.errors.map((err: any, idx: number) => (
                          <li key={idx} className="text-yellow-300 text-xs">
                            • {err.repository}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!syncResult.success && (
                <p className="text-sm text-red-300">{syncResult.error || 'Error desconocido'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
