import React, { useState } from 'react';
import { X, ArrowRightLeft, MapPin, User, FileText } from 'lucide-react';

export default function MoveMachineModal({ machine, onClose, onSave }) {
  const [newLocation, setNewLocation] = useState('');
  const [responsable, setResponsable] = useState(machine?.responsable || '');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!machine) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave(machine.id, newLocation, responsable, notas);
      onClose();
    } catch (err) {
      alert('Error al reubicar equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightLeft size={20} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cambiar Ubicación de Equipo</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{machine.modelo} (Activo: {machine.activo})</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          
          {/* Current Location Banner */}
          <div className="glass-panel" style={{ padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ubicación Actual:</p>
              <div className="badge badge-location" style={{ marginTop: 4, fontSize: '0.85rem' }}>
                <MapPin size={14} />
                {machine.ubicacion}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Serie:</p>
              <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{machine.serie}</span>
            </div>
          </div>

          {/* New Location Input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              <MapPin size={15} color="var(--accent-cyan)" />
              Nueva Ubicación en Bodega/Taller: *
            </label>
            <input 
              type="text"
              required
              className="input-control"
              placeholder="Ej. BVG1172, Estante B-4, Taller Principal..."
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
          </div>

          {/* Responsable Input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              <User size={15} color="var(--accent-emerald)" />
              Responsable de la Reubicación:
            </label>
            <input 
              type="text"
              className="input-control"
              placeholder="Nombre del técnico o responsable..."
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
            />
          </div>

          {/* Notes / Reason Input */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              <FileText size={15} color="var(--accent-amber)" />
              Motivo u Observaciones:
            </label>
            <textarea 
              rows={3}
              className="input-control"
              placeholder="Notas opcionales (ej. Mantenimiento preventivo, traslado por espacio...)"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Confirmar Reubicación'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
