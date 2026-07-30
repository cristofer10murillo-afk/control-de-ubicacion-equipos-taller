import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, X, CheckCircle2 } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // Check if app is running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar en iPhone/iPad: Toca el botón "Compartir" de Safari y selecciona "Agregar a inicio".\n\nEn PC/Android: Si no ves la ventana automática, busca el ícono de instalación en la barra del navegador.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <CheckCircle2 size={15} />
        <span>App Instalada</span>
      </div>
    );
  }

  return (
    <>
      {/* Install Button for Navbar */}
      <button 
        onClick={handleInstallClick}
        className="btn btn-accent"
        title="Instalar aplicación en tu computadora o celular"
        style={{ fontSize: '0.82rem', padding: '7px 14px' }}
      >
        <Download size={16} />
        <span>Instalar App</span>
      </button>

      {/* Floating Bottom Banner if prompt is active */}
      {deferredPrompt && showBanner && (
        <div style={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20, 
          zIndex: 60, 
          maxWidth: 380,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div className="glass-card" style={{ padding: 16, background: '#111827', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={20} color="#fff" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>¡Instala la App en tu dispositivo!</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Acceso rápido desde tu PC, Mac, Android o iPhone</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowBanner(false)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={handleInstallClick} className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}>
                <Download size={15} />
                <span>Instalar Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
