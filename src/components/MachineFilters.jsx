import React from 'react';
import { Filter, RotateCcw, Building2, CheckCircle2, Layers, UserCheck } from 'lucide-react';

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

  const handleScopeFilter = (scope) => {
    // scope: 'ALL' | 'BODEGA' | 'INSTALADO' | 'CLIENTE_ASIGNADO'
    if (scope === 'ALL') {
      setFilters(prev => ({ ...prev, scope: '', ubicacion: '' }));
    } else if (scope === 'INSTALADO') {
      setFilters(prev => ({ ...prev, scope: 'INSTALADO', ubicacion: '' }));
    } else if (scope === 'BODEGA') {
      setFilters(prev => ({ ...prev, scope: 'BODEGA', ubicacion: '' }));
    } else if (scope === 'CLIENTE_ASIGNADO') {
      setFilters(prev => ({ ...prev, scope: 'CLIENTE_ASIGNADO', ubicacion: '' }));
    }
  };

  const hasActiveFilters = Boolean(
    filters.modelo || filters.condicion || filters.activo || filters.serie || filters.ubicacion || filters.scope
  );

  // Separate installed vs bodega locations for dropdown
  const bodegaLocations = availableLocations.filter(u => u.toUpperCase().trim() !== 'INSTALADO');
  const isInstalledInList = availableLocations.some(u => u.toUpperCase().trim() === 'INSTALADO');

  return (
    <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24 }}>
      
      {/* Top Scope Tabs + Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        
        {/* Quick Scope Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          <button 
            type="button"
            onClick={() => handleScopeFilter('ALL')}
            className={`btn ${!filters.scope ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <Layers size={15} />
            <span>Todos los Equipos</span>
          </button>

          <button 
            type="button"
            onClick={() => handleScopeFilter('BODEGA')}
            className={`btn ${filters.scope === 'BODEGA' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              fontSize: '0.8rem', 
              padding: '6px 12px',
              borderColor: filters.scope === 'BODEGA' ? 'var(--accent-cyan)' : 'var(--border-color)',
              color: filters.scope === 'BODEGA' ? '#ffffff' : 'var(--text-main)'
            }}
          >
            <Building2 size={15} color="#22d3ee" />
            <span>En Bodega / Taller</span>
          </button>

          <button 
            type="button"
            onClick={() => handleScopeFilter('CLIENTE_ASIGNADO')}
            className={`btn ${filters.scope === 'CLIENTE_ASIGNADO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              fontSize: '0.8rem', 
              padding: '6px 12px',
              background: filters.scope === 'CLIENTE_ASIGNADO' ? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' : 'rgba(255, 255, 255, 0.05)',
              color: filters.scope === 'CLIENTE_ASIGNADO' ? '#ffffff' : '#c084fc',
              borderColor: 'rgba(168, 85, 247, 0.4)'
            }}
          >
            <UserCheck size={15} />
            <span>Con Cliente Asignado</span>
          </button>

          <button 
            type="button"
            onClick={() => handleScopeFilter('INSTALADO')}
            className={`btn ${filters.scope === 'INSTALADO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              fontSize: '0.8rem', 
              padding: '6px 12px',
              background: filters.scope === 'INSTALADO' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255, 255, 255, 0.05)',
              color: filters.scope === 'INSTALADO' ? '#ffffff' : '#34d399',
              borderColor: 'rgba(16, 185, 129, 0.3)'
            }}
          >
            <CheckCircle2 size={15} />
            <span>Instalados (Fuera de Taller)</span>
          </button>

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

      {/* Inputs Grid */}
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

        {/* Ubicación Grouped Select */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
            Ubicación Específica:
          </label>
          <select 
            className="input-control"
            value={filters.ubicacion}
            onChange={(e) => handleChange('ubicacion', e.target.value)}
          >
            <option value="">-- Todas las Ubicaciones --</option>
            
            {isInstalledInList && (
              <optgroup label="⚡ Fuera de Bodega">
                <option value="INSTALADO">INSTALADO (Fuera de Taller / Cliente)</option>
              </optgroup>
            )}

            <optgroup label="🏢 En Bodega / Taller">
              {bodegaLocations.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </optgroup>
          </select>
        </div>

      </div>
    </div>
  );
}
