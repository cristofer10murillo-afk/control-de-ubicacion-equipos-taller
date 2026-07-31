import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Tag, Key, Barcode, MapPin, User } from 'lucide-react';

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
    notas: ''
  });

  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
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
        notas: ''
      });

      setIsCustomModel(!isKnownModel && Boolean(existingModelo));
      setIsCustomLocation(!isKnownLocation && Boolean(existingUbicacion));
    }
  }, [machine]);

  const handleModelChange = (e) => {
    const val = e.target.value;
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
    const finalModelo = isCustomModel ? formData.customModelo.trim() : formData.modelo;
    const finalUbicacion = isCustomLocation ? formData.customUbicacion.trim() : formData.ubicacion;

    if (!finalModelo || !finalUbicacion) {
      alert('Por favor selecciona un Modelo y una Ubicación válidos.');
      return;
    }

    try {
      setIsSubmitting(true);
      const dataToSave = {
        modelo: finalModelo,
        activo: formData.activo,
        serie: formData.serie,
        condicion: formData.condicion,
        ubicacion: finalUbicacion,
        responsable: formData.responsable,
        notas: formData.notas
      };

      await onSave(dataToSave, machine ? machine.id : null);
      onClose();
    } catch (err) {
      alert('Error al guardar equipo: ' + err.message);
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
                N° Activo:
              </label>
              <input 
                type="text"
                className="input-control"
                placeholder="Ej. MQ016805 o N/A"
                value={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.value }))}
              />
            </div>

            {/* N° Serie */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                <Barcode size={15} color="var(--accent-emerald)" />
                N° Serie:
              </label>
              <input 
                type="text"
                className="input-control"
                placeholder="Ej. 42420078"
                value={formData.serie}
                onChange={(e) => setFormData(prev => ({ ...prev, serie: e.target.value }))}
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
