import React, { useState } from 'react';
import { X, Flame, Key, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { getSavedFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from '../firebase/config';

export default function FirebaseConfigModal({ onClose }) {
  const currentConfig = getSavedFirebaseConfig();

  const [config, setConfig] = useState({
    apiKey: currentConfig.apiKey || '',
    authDomain: currentConfig.authDomain || '',
    projectId: currentConfig.projectId || '',
    storageBucket: currentConfig.storageBucket || '',
    messagingSenderId: currentConfig.messagingSenderId || '',
    appId: currentConfig.appId || ''
  });

  const handleSave = (e) => {
    e.preventDefault();
    saveFirebaseConfig(config);
  };

  const handleClear = () => {
    if (window.confirm('¿Deseas desvincular Firebase y volver al modo Local Storage / Demo?')) {
      clearFirebaseConfig();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(249, 115, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={20} color="#f97316" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Configuración de Firebase</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sincronización en tiempo real en la nube</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: 24 }}>
          
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Ingresa las credenciales de tu proyecto de Firebase. También puedes configurarlas en <strong>Netlify</strong> como Variables de Entorno (ej. <code>VITE_FIREBASE_API_KEY</code>).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                API Key (apiKey):
              </label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="AIzaSy..." 
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                Project ID (projectId):
              </label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="mi-proyecto-12345" 
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                Auth Domain (authDomain):
              </label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="mi-proyecto.firebaseapp.com" 
                value={config.authDomain}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                App ID (appId):
              </label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="1:123456789:web:abcdef..." 
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              />
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleClear}
              style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}
            >
              <Trash2 size={15} />
              <span>Desconectar Firebase</span>
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
                <Save size={16} />
                <span>Guardar y Reiniciar</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
