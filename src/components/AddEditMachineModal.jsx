import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Tag, Key, Barcode, MapPin, User, Mail } from 'lucide-react';

export default function AddEditMachineModal({ machine, onClose, onSave }) {
  const isEditing = Boolean(machine);

  const [formData, setFormData] = useState({
    modelo: '',
    activo: '',
    serie: '',
    condicion: 'C',
    ubicacion: '',
    responsable: '',
    correo: '',
    notas: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (machine) {
      setFormData({
        modelo: machine.modelo || '',
        activo: machine.activo || '',
        serie: machine.serie || '',
        condicion: machine.condicion || 'C',
        ubicacion: machine.ubicacion || '',
        responsable: machine.responsable || '',
        correo: machine.correo || '',
        notas: ''
      });
    }
  }, [machine]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.modelo.trim() || !formData.ubicacion.trim()) {
      alert('Por favor completa el Modelo y la Ubicación.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData, machine ? machine.id : null);
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
            
            {/* Modelo / Tipo */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                <Tag size={15} color="var(--primary)" />
                Modelo de Máquina / Tipo: *
              </label>
              <input 
                type="text"
                required
                className="input-control"
                placeholder="Ej. Opera leyenda, Maestro, Opera Britt..."
                value={formData.modelo}
                onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
              />
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

            {/* Ubicación */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                <MapPin size={15} color="var(--accent-amber)" />
                Ubicación Actual: *
              </label>
              <input 
                type="text"
                required
                className="input-control"
                placeholder="Ej. BVG1171, BVF1191..."
                value={formData.ubicacion}
                onChange={(e) => setFormData(prev => ({ ...prev, ubicacion: e.target.value }))}
              />
            </div>

            {/* Responsable */}
            <div>
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

            {/* Correo */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                <Mail size={15} color="var(--text-muted)" />
                Correo Electrónico:
              </label>
              <input 
                type="email"
                className="input-control"
                placeholder="correo@empresa.com"
                value={formData.correo}
                onChange={(e) => setFormData(prev => ({ ...prev, correo: e.target.value }))}
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
