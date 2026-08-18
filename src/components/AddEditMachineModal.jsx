import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Tag, Key, Barcode, MapPin, User, UserCheck, AlertCircle, MessageSquare } from 'lucide-react';

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
  onSave 
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

    const finalModelo = isCustomModel ? formData.customModelo.trim() : formData.modelo;
    const finalUbicacion = isCustomLocation ? formData.customUbicacion.trim() : formData.ubicacion;
    const finalActivo = (formData.activo || '').trim();
    const finalSerie = (formData.serie || '').trim();

    if (!finalModelo || !finalUbicacion) {
      setErrorMessage('Por favor selecciona un Modelo y una Ubicación válidos.');
      return;
    }

    // Uniqueness validation for N° Activo
    if (finalActivo && finalActivo.toUpperCase() !== 'N/A' && !finalActivo.toUpperCase().includes('SIN RESPUESTA') && finalActivo.toUpperCase() !== 'NUEVA') {
      const duplicateActivo = allMachines.find(m => {
        if (machine && m.id === machine.id) return false;
        return (m.activo || '').trim().toUpperCase() === finalActivo.toUpperCase();
      });

      if (duplicateActivo) {
        setErrorMessage(`⚠️ El N° de Activo "${finalActivo}" ya existe registrado en la máquina "${duplicateActivo.modelo}" (Serie: ${duplicateActivo.serie}). No se permiten activos duplicados.`);
        return;
      }
    }

    // Uniqueness validation for N° Serie
    if (finalSerie && finalSerie.toUpperCase() !== 'N/A' && !finalSerie.toUpperCase().includes('SIN RESPUESTA')) {
      const duplicateSerie = allMachines.find(m => {
        if (machine && m.id === machine.id) return false;
        return (m.serie || '').trim().toUpperCase() === finalSerie.toUpperCase();
      });

      if (duplicateSerie) {
        setErrorMessage(`⚠️ El N° de Serie "${finalSerie}" ya existe registrado en la máquina "${duplicateSerie.modelo}" (Activo: ${duplicateSerie.activo}). No se permiten series duplicadas.`);
        return;
      }
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
                {isEditing ? 'Editar Registro de Equipo' : 'Agregar Nuevo Equipo'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isEditing ? `Modificar ID: ${machine.id}` : 'Ingrese los datos generales del nuevo equipo de taller'}
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
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Equipo')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
