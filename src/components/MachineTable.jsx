import React, { useState } from 'react';
import { 
  MapPin, 
  History, 
  Edit3, 
  Trash2, 
  ArrowRightLeft, 
  LayoutList, 
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  CheckCircle2,
  Building2
} from 'lucide-react';

export default function MachineTable({ 
  machines, 
  onMoveClick, 
  onHistoryClick, 
  onEditClick, 
  onDeleteClick 
}) {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const totalPages = Math.ceil(machines.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMachines = machines.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getCondBadgeClass = (cond) => {
    switch (cond) {
      case 'A': return 'badge-cond-A';
      case 'B': return 'badge-cond-B';
      case 'C': return 'badge-cond-C';
      case 'D': return 'badge-cond-D';
      default: return 'badge-cond-C';
    }
  };

  const renderLocationBadge = (location) => {
    const isInstalled = (location || '').toUpperCase().trim() === 'INSTALADO';

    if (isInstalled) {
      return (
        <span 
          className="badge" 
          style={{ 
            background: 'rgba(16, 185, 129, 0.2)', 
            color: '#34d399', 
            border: '1px solid rgba(16, 185, 129, 0.5)',
            fontFamily: 'JetBrains Mono, monospace',
            padding: '5px 10px'
          }}
          title="Equipo fuera de bodega / Instalado en cliente"
        >
          <CheckCircle2 size={13} color="#34d399" />
          INSTALADO (Fuera)
        </span>
      );
    }

    return (
      <span className="badge badge-location" title="Ubicación dentro de bodega/taller">
        <Building2 size={12} />
        {location}
      </span>
    );
  };

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Listado de Equipos ({machines.length})
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Página {currentPage} de {totalPages}
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(15, 23, 42, 0.6)', padding: 4, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn btn-icon ${viewMode === 'table' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('table')}
            title="Vista de Tabla"
            style={{ padding: '6px 10px' }}
          >
            <LayoutList size={16} />
          </button>
          <button 
            className={`btn btn-icon ${viewMode === 'grid' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Vista de Tarjetas"
            style={{ padding: '6px 10px' }}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {machines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <PackageCheck size={48} color="var(--text-subdued)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No se encontraron máquinas</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-subdued)', marginTop: 4 }}>
            Prueba ajustando los filtros de búsqueda o agrega un nuevo equipo.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE VIEW */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 14px' }}>#</th>
                <th style={{ padding: '12px 14px' }}>Modelo / Tipo</th>
                <th style={{ padding: '12px 14px' }}>N° Activo</th>
                <th style={{ padding: '12px 14px' }}>N° Serie</th>
                <th style={{ padding: '12px 14px' }}>Condición</th>
                <th style={{ padding: '12px 14px' }}>Ubicación / Estado</th>
                <th style={{ padding: '12px 14px' }}>Responsable</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentMachines.map((m, index) => {
                const isInstalled = (m.ubicacion || '').toUpperCase().trim() === 'INSTALADO';

                return (
                  <tr 
                    key={m.id} 
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: isInstalled ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = isInstalled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isInstalled ? 'rgba(16, 185, 129, 0.03)' : 'transparent'}
                  >
                    <td style={{ padding: '14px', color: 'var(--text-subdued)', fontSize: '0.75rem' }} className="font-mono">
                      {startIndex + index + 1}
                    </td>
                    <td style={{ padding: '14px', fontWeight: 600 }}>
                      {m.modelo}
                    </td>
                    <td style={{ padding: '14px' }} className="font-mono">
                      <span style={{ color: m.activo === 'N/A' ? 'var(--text-subdued)' : 'var(--accent-cyan)' }}>
                        {m.activo}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }} className="font-mono">
                      <span style={{ color: m.serie === 'N/A' ? 'var(--text-subdued)' : 'var(--text-main)' }}>
                        {m.serie}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span className={`badge ${getCondBadgeClass(m.condicion)}`}>
                        Cond. {m.condicion}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      {renderLocationBadge(m.ubicacion)}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {m.responsable || 'Sistema'}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        
                        {/* Cambiar Ubicación */}
                        <button 
                          onClick={() => onMoveClick(m)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          title="Cambiar ubicación"
                        >
                          <ArrowRightLeft size={14} color="var(--primary)" />
                          <span>Mover</span>
                        </button>

                        {/* Ver Historial */}
                        <button 
                          onClick={() => onHistoryClick(m)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          title="Ver historial de reubicaciones"
                        >
                          <History size={14} color="var(--accent-emerald)" />
                          <span>Historial</span>
                        </button>

                        {/* Editar */}
                        <button 
                          onClick={() => onEditClick(m)}
                          className="btn btn-icon"
                          title="Editar máquina"
                        >
                          <Edit3 size={15} color="var(--text-muted)" />
                        </button>

                        {/* Eliminar */}
                        <button 
                          onClick={() => onDeleteClick(m)}
                          className="btn btn-icon"
                          title="Eliminar máquina"
                        >
                          <Trash2 size={15} color="var(--accent-rose)" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        
        /* GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {currentMachines.map(m => {
            const isInstalled = (m.ubicacion || '').toUpperCase().trim() === 'INSTALADO';

            return (
              <div 
                key={m.id} 
                className="glass-panel" 
                style={{ 
                  padding: 16, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justify: 'space-between',
                  border: isInstalled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                  background: isInstalled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(31, 41, 61, 0.6)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{m.modelo}</h4>
                    <span className={`badge ${getCondBadgeClass(m.condicion)}`}>
                      Cond. {m.condicion}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>N° Activo:</span>
                      <span className="font-mono" style={{ color: '#22d3ee', fontWeight: 600 }}>{m.activo}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>N° Serie:</span>
                      <span className="font-mono">{m.serie}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ubicación:</span>
                      {renderLocationBadge(m.ubicacion)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-subdued)', fontSize: '0.75rem', marginTop: 2 }}>
                      <span>Resp: {m.responsable || 'N/A'}</span>
                      <span>{m.historial ? `${m.historial.length} reg.` : '1 reg.'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <button 
                    onClick={() => onMoveClick(m)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                  >
                    <ArrowRightLeft size={14} />
                    <span>Mover</span>
                  </button>
                  <button 
                    onClick={() => onHistoryClick(m)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                  >
                    <History size={14} />
                    <span>Historial</span>
                  </button>
                  <button 
                    onClick={() => onEditClick(m)}
                    className="btn btn-icon"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, machines.length)} de {machines.length} equipos
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </button>

            <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 8px' }}>
              {currentPage} / {totalPages}
            </span>

            <button 
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
