import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, MapPin, User, FileText, CheckCircle2, Building2 } from 'lucide-react';

const DEFAULT_LOCATIONS = [
  'BVE1111',
  'BVF1111',
  'BVF1131',
  'BVF1151',
  'BVF1171',
  'BVF1191',
  'BVG1091',
  'BVG1111',
  'BVG1131',
  'BVG1151',
  'BVG1171',
  'BVTALLER',
  'PASILLO',
  'INSTALADO'
];

export default function MoveMachineModal({ machine, availableLocations = [], onClose, onSave }) {
  // Combine default locations with dynamic locations from current inventory
  const allLocations = Array.from(
    new Set([...DEFAULT_LOCATIONS, ...availableLocations.filter(Boolean)])
  );

  const bodegaLocations = allLocations
    .filter(u => u.toUpperCase().trim() !== 'INSTALADO')
    .sort();

  const [selectedLocation, setSelectedLocation] = useState(bodegaLocations[0] || 'BVF1171');
  const [customLocation, setCustomLocation] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [responsable, setResponsable] = useState(machine?.responsable || '');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (machine) {
      setResponsable(machine.responsable || '');
    }
  }, [machine]);

  if (!machine) return null;

  const handleLocationChange = (e) => {
    const val = e.target.value;
    if (val === 'OTRA') {
      setIsCustom(true);
      setSelectedLocation('OTRA');
    } else {
      setIsCustom(false);
      setSelectedLocation(val);
      setCustomLocation('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalLocation = isCustom ? customLocation.trim() : selectedLocation;

    if (!finalLocation) {
      alert('Por favor selecciona una ubicación válida.');
      return;
    }

    if (finalLocation === machine.ubicacion) {
      if (!window.confirm(`El equipo ya se encuentra registrado en "${finalLocation}". ¿Deseas actualizar los datos del movimiento de todas formas?`)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSave(machine.id, finalLocation, responsable, notas);
      onClose();
    } catch (err) {
      alert('Error al reubicar equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentInstalled = (machine.ubicacion || '').toUpperCase().trim() === 'INSTALADO';

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
              {isCurrentInstalled ? (
                <span className="badge" style={{ marginTop: 4, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                  <CheckCircle2 size={13} color="#34d399" />
                  INSTALADO (Fuera de Taller)
                </span>
              ) : (
                <span className="badge badge-location" style={{ marginTop: 4, fontSize: '0.85rem' }}>
                  <Building2 size={13} />
                  {machine.ubicacion}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Serie:</p>
              <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{machine.serie}</span>
            </div>
          </div>

          {/* New Location Dropdown Select */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              <MapPin size={15} color="var(--accent-cyan)" />
              Nueva Ubicación Oficial: *
            </label>
            <select 
              className="input-control"
              value={isCustom ? 'OTRA' : selectedLocation}
              onChange={handleLocationChange}
            >
              <optgroup label="⚡ Fuera de Bodega">
                <option value="INSTALADO">INSTALADO (Fuera de Taller / Cliente)</option>
              </optgroup>

              <optgroup label="🏢 En Bodega / Taller">
                {bodegaLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </optgroup>

              <option value="OTRA">+ Agregar otra ubicación nueva...</option>
            </select>

            {/* Custom Location input if OTRA selected */}
            {isCustom && (
              <input 
                type="text"
                required
                className="input-control"
                placeholder="Escribe el nombre de la nueva ubicación..."
                style={{ marginTop: 8 }}
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
              />
            )}
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
