import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

export default function MachineFilters({ 
  filters, 
  setFilters, 
  availableModels, 
  availableLocations,
  onResetFilters 
}) {
  const handleChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const hasActiveFilters = Boolean(
    filters.modelo || filters.condicion || filters.activo || filters.serie || filters.ubicacion
  );

  return (
    <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Filtros de Búsqueda Avanzada</h3>
        </div>

        {hasActiveFilters && (
          <button 
            onClick={onResetFilters} 
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            <RotateCcw size={14} />
            <span>Limpiar Filtros</span>
          </button>
        )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 12 
      }}>
        
        {/* Modelo / Tipo */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
            Modelo / Tipo:
          </label>
          <select 
            className="input-control"
            value={filters.modelo}
            onChange={(e) => handleChange('modelo', e.target.value)}
          >
            <option value="">-- Todos los Modelos --</option>
            {availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Condición */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
            Condición:
          </label>
          <select 
            className="input-control"
            value={filters.condicion}
            onChange={(e) => handleChange('condicion', e.target.value)}
          >
            <option value="">-- Todas --</option>
            <option value="A">Condición A (Excelente)</option>
            <option value="B">Condición B (Buena)</option>
            <option value="C">Condición C (Regular)</option>
            <option value="D">Condición D (Revisión / Taller)</option>
          </select>
        </div>

        {/* N° Activo */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
            N° Activo (Ej. MQ...):
          </label>
          <input 
            type="text"
            className="input-control"
            placeholder="Filtrar por Activo..."
            value={filters.activo}
            onChange={(e) => handleChange('activo', e.target.value)}
          />
        </div>

        {/* N° Serie */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
            N° Serie:
          </label>
          <input 
            type="text"
            className="input-control"
            placeholder="Filtrar por Serie..."
            value={filters.serie}
            onChange={(e) => handleChange('serie', e.target.value)}
          />
        </div>

        {/* Ubicación */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
            Ubicación:
          </label>
          <select 
            className="input-control"
            value={filters.ubicacion}
            onChange={(e) => handleChange('ubicacion', e.target.value)}
          >
            <option value="">-- Todas las Ubicaciones --</option>
            {availableLocations.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
}
