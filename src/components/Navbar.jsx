import React from 'react';
import { 
  Boxes, 
  Plus, 
  FileSpreadsheet, 
  Search, 
  Flame,
  HardDrive
} from 'lucide-react';
import { isFirebaseConfigured } from '../firebase/config';
import PWAInstallPrompt from './PWAInstallPrompt';

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  onOpenAddModal, 
  onOpenImportModal,
  onOpenFirebaseModal
}) {
  return (
    <header className="glass-card" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 40, padding: '14px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img 
            src="/pwa-192x192.png" 
            alt="Logo App" 
            style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }} 
          />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Control de Ubicación de Equipos
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Taller & Bodega | App Instalable PWA
            </p>
          </div>
        </div>

        {/* Global Quick Search */}
        <div style={{ flex: '1 1 260px', maxWidth: 400, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subdued)' }} />
          <input 
            type="text"
            className="input-control"
            placeholder="Buscar por activo, serie, modelo, condición o ubicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 42, background: 'rgba(15, 23, 42, 0.9)' }}
          />
        </div>

        {/* Action Buttons & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          
          {/* PWA Install Button */}
          <PWAInstallPrompt />

          {/* Firebase Connection Badge */}
          <button 
            onClick={onOpenFirebaseModal}
            className="btn btn-secondary"
            title="Configurar conexión con Firebase Firestore"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            {isFirebaseConfigured ? (
              <>
                <Flame size={15} color="#f97316" />
                <span style={{ color: '#f97316', fontWeight: 600 }}>Firebase</span>
              </>
            ) : (
              <>
                <HardDrive size={15} color="#9ca3af" />
                <span>Modo Local</span>
              </>
            )}
          </button>

          {/* Import / Export Excel */}
          <button 
            onClick={onOpenImportModal}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <FileSpreadsheet size={18} color="#10b981" />
            <span>Excel</span>
          </button>

          {/* Add Machine Button */}
          <button 
            onClick={onOpenAddModal}
            className="btn btn-primary"
          >
            <Plus size={18} />
            <span>+ Nuevo</span>
          </button>

        </div>

      </div>
    </header>
  );
}
