import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, MapPin, User, FileText, CheckCircle2, Building2, UserCheck, AlertTriangle } from 'lucide-react';

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
  const [clienteAsignado, setClienteAsignado] = useState(Boolean(machine?.clienteAsignado));
  const [nombreCliente, setNombreCliente] = useState(machine?.nombreCliente || '');
  const [notas, setNotas] = useState('');
  const [showReturnWarning, setShowReturnWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (machine) {
      setResponsable(machine.responsable || '');
      setClienteAsignado(Boolean(machine.clienteAsignado));
      setNombreCliente(machine.nombreCliente || '');

      const existingLoc = machine.ubicacion || '';
      if (allLocations.includes(existingLoc)) {
        setSelectedLocation(existingLoc);
        setIsCustom(false);
      } else {
        setSelectedLocation('OTRA');
        setCustomLocation(existingLoc);
        setIsCustom(true);
      }
    }
  }, [machine]);

  if (!machine) return null;

  const isCurrentInstalled = (machine.ubicacion || '').toUpperCase().trim() === 'INSTALADO';

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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const finalLocation = isCustom ? customLocation.trim() : selectedLocation;

    if (!finalLocation) {
      alert('Por favor selecciona una ubicación válida.');
      return;
    }

    const isTargetInstalled = finalLocation.toUpperCase().trim() === 'INSTALADO';

    // If machine is currently INSTALADO and target is NOT INSTALADO (returning to workshop)
    if (isCurrentInstalled && !isTargetInstalled) {
      setShowReturnWarning(true);
      return;
    }

    // Proceed directly
    executeMove(finalLocation);
  };

  const executeMove = async (targetLoc = null) => {
    const finalLocation = targetLoc || (isCustom ? customLocation.trim() : selectedLocation);

    try {
      setIsSubmitting(true);
      await onSave(machine.id, finalLocation, responsable, notas, clienteAsignado, nombreCliente);
      onClose();
    } catch (err) {
      alert('Error al reubicar equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
      setShowReturnWarning(false);
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
        <form onSubmit={handleFormSubmit} style={{ padding: 24 }}>
          
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

          {/* RETURN FROM INSTALADO WARNING PROMPT */}
          {showReturnWarning && (
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.15)', 
              border: '1px solid rgba(245, 158, 11, 0.5)', 
              padding: 16, 
              borderRadius: 12, 
              marginBottom: 20, 
              animation: 'fadeIn 0.2s ease-out' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#fbbf24' }}>
                <AlertTriangle size={22} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Confirmación de Devolución a Taller / Bodega</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4, marginBottom: 14 }}>
                ⚠️ <strong>¿Está seguro que desea devolver esta máquina al taller?</strong>
                <br />
                El equipo pasará de estar <strong>INSTALADO en cliente</strong> a estar nuevamente guardado en <strong>BODEGA/TALLER</strong> en la ubicación <span className="font-mono" style={{ color: '#22d3ee' }}>{isCustom ? customLocation : selectedLocation}</span>.
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowReturnWarning(false)}
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancelar / Revisar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => executeMove()}
                  disabled={isSubmitting}
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', fontSize: '0.8rem' }}
                >
                  {isSubmitting ? 'Guardando...' : 'Sí, Devolver a Taller'}
                </button>
              </div>
            </div>
          )}

          {!showReturnWarning && (
            <>
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

              {/* Cliente Asignado Checkbox */}
              <div style={{ 
                marginBottom: 16, 
                background: clienteAsignado ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)', 
                padding: 14, 
                borderRadius: 10, 
                border: clienteAsignado ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-color)',
                transition: 'all 0.2s ease'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>
                  <input 
                    type="checkbox"
                    checked={clienteAsignado}
                    onChange={(e) => setClienteAsignado(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <UserCheck size={18} color={clienteAsignado ? '#818cf8' : 'var(--text-muted)'} />
                  <span style={{ color: clienteAsignado ? '#ffffff' : 'var(--text-main)' }}>
                    Equipo en bodega ya tiene cliente asignado / reservado
                  </span>
                </label>

                {clienteAsignado && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                      Nombre del Cliente Asignado:
                    </label>
                    <input 
                      type="text"
                      className="input-control"
                      placeholder="Ej. Hotel Westin, Cafetería Central, Cliente XYZ..."
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                    />
                  </div>
                )}
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
            </>
          )}

        </form>

      </div>
    </div>
  );
}
