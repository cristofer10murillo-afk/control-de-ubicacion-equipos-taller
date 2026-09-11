import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Tag, Key, Barcode, MapPin, User, UserCheck, AlertCircle, MessageSquare, AlertTriangle, ArrowRightLeft } from 'lucide-react';

const DEFAULT_MODELS = [
  'Maestro',
  'Opera Britt',
  'Opera leyenda',
  'Swing britt',
  'Swing leyenda',
  'Tango'
];

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

export default function AddEditMachineModal({ 
  machine, 
  allMachines = [],
  availableModels = [], 
  availableLocations = [], 
  onClose, 
  onSave,
  onReentrySave
}) {
  const isEditing = Boolean(machine);

  // Models list
  const modelOptions = Array.from(
    new Set([...DEFAULT_MODELS, ...availableModels.filter(Boolean)])
  ).sort();

  // Locations list
  const allLocations = Array.from(
    new Set([...DEFAULT_LOCATIONS, ...availableLocations.filter(Boolean)])
  );
  const bodegaLocations = allLocations
    .filter(u => u.toUpperCase().trim() !== 'INSTALADO')
    .sort();

  const [formData, setFormData] = useState({
    modelo: modelOptions[0] || 'Maestro',
    customModelo: '',
    activo: '',
    serie: '',
    condicion: 'C',
    ubicacion: bodegaLocations[0] || 'BVF1171',
    customUbicacion: '',
    responsable: '',
    clienteAsignado: false,
    nombreCliente: '',
    comentarios: '',
    notas: ''
  });

  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reentryMatch, setReentryMatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (machine) {
      const existingModelo = machine.modelo || '';
      const isKnownModel = modelOptions.includes(existingModelo);

      const existingUbicacion = machine.ubicacion || '';
      const isKnownLocation = allLocations.includes(existingUbicacion);

      setFormData({
        modelo: isKnownModel ? existingModelo : 'OTRO',
        customModelo: isKnownModel ? '' : existingModelo,
        activo: machine.activo || '',
        serie: machine.serie || '',
        condicion: machine.condicion || 'C',
        ubicacion: isKnownLocation ? existingUbicacion : 'OTRA',
        customUbicacion: isKnownLocation ? '' : existingUbicacion,
        responsable: machine.responsable || '',
        clienteAsignado: Boolean(machine.clienteAsignado),
        nombreCliente: machine.nombreCliente || '',
        comentarios: machine.comentarios || '',
        notas: ''
      });

      setIsCustomModel(!isKnownModel && Boolean(existingModelo));
      setIsCustomLocation(!isKnownLocation && Boolean(existingUbicacion));
    }
  }, [machine]);

  const handleModelChange = (e) => {
    const val = e.target.value;
    setErrorMessage('');
    setReentryMatch(null);
    if (val === 'OTRO') {
      setIsCustomModel(true);
      setFormData(prev => ({ ...prev, modelo: 'OTRO' }));
    } else {
      setIsCustomModel(false);
      setFormData(prev => ({ ...prev, modelo: val, customModelo: '' }));
    }
  };

  const handleLocationChange = (e) => {
    const val = e.target.value;
    setErrorMessage('');
    setReentryMatch(null);
    if (val === 'OTRA') {
      setIsCustomLocation(true);
      setFormData(prev => ({ ...prev, ubicacion: 'OTRA' }));
    } else {
      setIsCustomLocation(false);
      setFormData(prev => ({ ...prev, ubicacion: val, customUbicacion: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setReentryMatch(null);

    const finalModelo = isCustomModel ? formData.customModelo.trim() : formData.modelo;
    const finalUbicacion = isCustomLocation ? formData.customUbicacion.trim() : formData.ubicacion;
    const finalActivo = (formData.activo || '').trim();
    const finalSerie = (formData.serie || '').trim();

    if (!finalModelo || !finalUbicacion) {
      setErrorMessage('Por favor selecciona un Modelo y una Ubicación válidos.');
      return;
    }

    // Check if Activo or Serie matches an existing machine
    const matchingMachine = allMachines.find(m => {
      if (machine && m.id === machine.id) return false;
      const matchAct = finalActivo && finalActivo.toUpperCase() !== 'N/A' && !finalActivo.toUpperCase().includes('SIN RESPUESTA') && finalActivo.toUpperCase() !== 'NUEVA' && (m.activo || '').trim().toUpperCase() === finalActivo.toUpperCase();
      const matchSer = finalSerie && finalSerie.toUpperCase() !== 'N/A' && !finalSerie.toUpperCase().includes('SIN RESPUESTA') && (m.serie || '').trim().toUpperCase() === finalSerie.toUpperCase();
      return matchAct || matchSer;
    });

    if (matchingMachine) {
      const matchIsInstalled = (matchingMachine.ubicacion || '').toUpperCase().trim() === 'INSTALADO' || matchingMachine.clienteAsignado;
      const targetIsBodega = finalUbicacion.toUpperCase().trim() !== 'INSTALADO';

      // Special Case: Equipment is INSTALADO and user is entering/re-locating it back to Bodega/Taller
      if (matchIsInstalled && targetIsBodega) {
        setReentryMatch({
          machine: matchingMachine,
          targetLocation: finalUbicacion,
          finalModelo,
          finalActivo,
          finalSerie
        });
        return;
      }

      // Otherwise, standard duplicate error
      setErrorMessage(`⚠️ El equipo (Activo: "${matchingMachine.activo}", Serie: "${matchingMachine.serie}") ya existe registrado en el inventario (${matchingMachine.modelo}). No se permiten registros duplicados.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const dataToSave = {
        modelo: finalModelo,
        activo: finalActivo || 'N/A',
        serie: finalSerie || 'N/A',
        condicion: formData.condicion,
        ubicacion: finalUbicacion,
        responsable: formData.responsable,
        clienteAsignado: formData.clienteAsignado,
        nombreCliente: formData.nombreCliente,
        comentarios: formData.comentarios ? formData.comentarios.trim() : '',
        notas: formData.notas
      };

      await onSave(dataToSave, machine ? machine.id : null);
      onClose();
    } catch (err) {
      setErrorMessage('Error al guardar equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReentry = async () => {
    if (!reentryMatch) return;
    const { machine: targetMachine, targetLocation } = reentryMatch;

    try {
      setIsSubmitting(true);
      if (onReentrySave) {
        await onReentrySave(
          targetMachine.id, 
          targetLocation, 
          formData.responsable || 'Sistema', 
          formData.notas || 'Reingreso de equipo desde cliente/instalado a taller',
          formData.clienteAsignado,
          formData.nombreCliente
        );
      } else {
        await onSave({
          ...targetMachine,
          ubicacion: targetLocation,
          responsable: formData.responsable || targetMachine.responsable,
          clienteAsignado: formData.clienteAsignado,
          nombreCliente: formData.nombreCliente,
          comentarios: formData.comentarios || targetMachine.comentarios
        }, targetMachine.id);
      }
      onClose();
    } catch (err) {
      setErrorMessage('Error al reingresar equipo: ' + err.message);
    } finally {
      setIsSubmitting(false);
      setReentryMatch(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isEditing ? <Edit3 size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {isEditing ? 'Editar Registro de Equipo' : 'Agregar / Reingresar Equipo'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isEditing ? `Modificar ID: ${machine.id}` : 'Ingrese los datos generales del equipo'}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          
          {/* Error Message Banner */}
          {errorMessage && (
            <div style={{ 
              background: 'rgba(244, 63, 94, 0.15)', 
              border: '1px solid rgba(244, 63, 94, 0.4)', 
              color: '#f87171', 
              padding: '12px 16px', 
              borderRadius: 8, 
              fontSize: '0.82rem', 
              marginBottom: 16, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10 
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* REENTRY WARNING BANNER PROMPT */}
          {reentryMatch && (
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
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Confirmación de Reingreso de Equipo Instalado</h4>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4, marginBottom: 12 }}>
                ⚠️ <strong>El equipo {reentryMatch.machine.modelo} (Activo: {reentryMatch.machine.activo}, Serie: {reentryMatch.machine.serie}) actualmente figura como INSTALADO</strong>
                {reentryMatch.machine.nombreCliente ? ` en el cliente "${reentryMatch.machine.nombreCliente}"` : ''}.
              </p>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: 14 }}>
                ¿Está seguro que desea reingresar esta máquina al taller en la ubicación <span className="font-mono" style={{ color: '#22d3ee' }}>{reentryMatch.targetLocation}</span>?
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setReentryMatch(null)}
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancelar / Corregir
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleConfirmReentry}
                  disabled={isSubmitting}
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', fontSize: '0.8rem' }}
                >
                  <ArrowRightLeft size={15} />
                  <span>{isSubmitting ? 'Procesando...' : 'Sí, Reingresar Equipo a Taller'}</span>
                </button>
              </div>
            </div>
          )}

          {!reentryMatch && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                
                {/* Modelo / Tipo Dropdown Select */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    <Tag size={15} color="var(--primary)" />
                    Modelo / Tipo: *
                  </label>
                  <select 
                    className="input-control"
                    value={isCustomModel ? 'OTRO' : formData.modelo}
                    onChange={handleModelChange}
                  >
                    {modelOptions.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="OTRO">+ Agregar otro modelo personalizado...</option>
                  </select>

                  {isCustomModel && (
                    <input 
                      type="text"
                      required
                      className="input-control"
                      placeholder="Escribe el nuevo modelo..."
                      style={{ marginTop: 8 }}
                      value={formData.customModelo}
                      onChange={(e) => setFormData(prev => ({ ...prev, customModelo: e.target.value }))}
                    />
                  )}
                </div>

                {/* N° Activo */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    <Key size={15} color="var(--accent-cyan)" />
                    N° Activo (Único):
                  </label>
                  <input 
                    type="text"
                    className="input-control"
                    placeholder="Ej. MQ016805 o N/A"
                    value={formData.activo}
                    onChange={(e) => {
                      setErrorMessage('');
                      setReentryMatch(null);
                      setFormData(prev => ({ ...prev, activo: e.target.value }));
                    }}
                  />
                </div>

                {/* N° Serie */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    <Barcode size={15} color="var(--accent-emerald)" />
                    N° Serie (Único):
                  </label>
                  <input 
                    type="text"
                    className="input-control"
                    placeholder="Ej. 42420078"
                    value={formData.serie}
                    onChange={(e) => {
                      setErrorMessage('');
                      setReentryMatch(null);
                      setFormData(prev => ({ ...prev, serie: e.target.value }));
                    }}
                  />
                </div>

                {/* Condición */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    Condición: *
                  </label>
                  <select 
                    className="input-control"
                    value={formData.condicion}
                    onChange={(e) => setFormData(prev => ({ ...prev, condicion: e.target.value }))}
                  >
                    <option value="A">Condición A (Excelente)</option>
                    <option value="B">Condición B (Buena)</option>
                    <option value="C">Condición C (Regular)</option>
                    <option value="D">Condición D (Revisión / Taller)</option>
                  </select>
                </div>

                {/* Ubicación Dropdown Select */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    <MapPin size={15} color="var(--accent-amber)" />
                    Ubicación Inicial: *
                  </label>
                  <select 
                    className="input-control"
                    value={isCustomLocation ? 'OTRA' : formData.ubicacion}
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

                  {isCustomLocation && (
                    <input 
                      type="text"
                      required
                      className="input-control"
                      placeholder="Escribe la nueva ubicación..."
                      style={{ marginTop: 8 }}
                      value={formData.customUbicacion}
                      onChange={(e) => setFormData(prev => ({ ...prev, customUbicacion: e.target.value }))}
                    />
                  )}
                </div>

                {/* Responsable */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    <User size={15} color="var(--text-muted)" />
                    Nombre Responsable:
                  </label>
                  <input 
                    type="text"
                    className="input-control"
                    placeholder="Nombre del técnico..."
                    value={formData.responsable}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                  />
                </div>

                {/* Asignación a Cliente Checkbox & Input */}
                <div style={{ 
                  gridColumn: '1 / -1', 
                  background: formData.clienteAsignado ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)', 
                  padding: 14, 
                  borderRadius: 10, 
                  border: formData.clienteAsignado ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>
                    <input 
                      type="checkbox"
                      checked={formData.clienteAsignado}
                      onChange={(e) => setFormData(prev => ({ ...prev, clienteAsignado: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <UserCheck size={18} color={formData.clienteAsignado ? '#818cf8' : 'var(--text-muted)'} />
                    <span style={{ color: formData.clienteAsignado ? '#ffffff' : 'var(--text-main)' }}>
                      Equipo en bodega ya tiene cliente asignado / reservado
                    </span>
                  </label>

                  {formData.clienteAsignado && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                        Nombre del Cliente Asignado:
                      </label>
                      <input 
                        type="text"
                        className="input-control"
                        placeholder="Ej. Hotel Westin, Cafetería Central, Cliente XYZ..."
                        value={formData.nombreCliente}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombreCliente: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                {/* Características Especiales / Comentarios */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                    <MessageSquare size={15} color="var(--accent-cyan)" />
                    Características Especiales / Comentarios:
                  </label>
                  <textarea 
                    rows={3}
                    className="input-control"
                    placeholder="Ej. Requiere transformador 220V, incluye molino adicional, faltan accesorios, detalle estético en puerta..."
                    value={formData.comentarios}
                    onChange={(e) => setFormData(prev => ({ ...prev, comentarios: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>

              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear / Guardar Equipo')}
                </button>
              </div>
            </>
          )}

        </form>

      </div>
    </div>
  );
}
