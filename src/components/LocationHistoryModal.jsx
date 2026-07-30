import React from 'react';
import { X, History, MapPin, Calendar, User, Clock, ArrowRight } from 'lucide-react';

export default function LocationHistoryModal({ machine, onClose }) {
  if (!machine) return null;

  const history = machine.historial || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={20} color="var(--accent-emerald)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historial de Ubicaciones</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{machine.modelo} | Activo: {machine.activo} | Serie: {machine.serie}</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Timeline Content */}
        <div style={{ padding: 24, maxHeight: '65vh', overflowY: 'auto' }}>
          
          {/* Current Status Pill */}
          <div className="glass-panel" style={{ padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ubicación Actual:</span>
            <span className="badge badge-location" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
              <MapPin size={14} />
              {machine.ubicacion}
            </span>
          </div>

          {history.length === 0 ? (
            <p style={{ color: 'var(--text-subdued)', textAlign: 'center', padding: 20 }}>
              No se han registrado movimientos previos para este equipo.
            </p>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid rgba(255, 255, 255, 0.1)' }}>
              {history.map((entry, idx) => (
                <div key={entry.id || idx} style={{ position: 'relative', marginBottom: 24 }}>
                  
                  {/* Bullet Node */}
                  <div style={{ 
                    position: 'absolute', 
                    left: -32, 
                    top: 2, 
                    width: 14, 
                    height: 14, 
                    borderRadius: '50%', 
                    background: idx === 0 ? 'var(--accent-emerald)' : 'var(--primary)',
                    border: '3px solid #111827',
                    boxShadow: idx === 0 ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none'
                  }} />

                  {/* Entry Card */}
                  <div className="glass-panel" style={{ padding: 14 }}>
                    
                    {/* Header info */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Clock size={13} />
                        <span>{entry.fecha}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-subdued)' }}>
                        <User size={13} />
                        <span>{entry.responsable || 'Sistema'}</span>
                      </div>
                    </div>

                    {/* Movement direction */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {entry.ubicacionAnterior || 'Inicio'}
                      </span>
                      <ArrowRight size={14} color="var(--text-subdued)" />
                      <span className="badge badge-location" style={{ fontSize: '0.8rem' }}>
                        {entry.ubicacionNueva || machine.ubicacion}
                      </span>
                    </div>

                    {/* Notes */}
                    {entry.notas && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.5)', padding: 8, borderRadius: 6, marginTop: 8 }}>
                        "{entry.notas}"
                      </p>
                    )}

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>

      </div>
    </div>
  );
}
