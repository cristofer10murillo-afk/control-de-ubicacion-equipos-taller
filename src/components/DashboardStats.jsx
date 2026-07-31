import React from 'react';
import { 
  Package, 
  MapPin, 
  History, 
  AlertTriangle,
  Building2,
  CheckCircle2
} from 'lucide-react';

export default function DashboardStats({ machines }) {
  const totalMachines = machines.length;

  // Distinguish installed (outside bodega/taller) vs inside bodega/taller
  const installedMachines = machines.filter(m => (m.ubicacion || '').toUpperCase().trim() === 'INSTALADO');
  const inBodegaMachines = machines.filter(m => (m.ubicacion || '').toUpperCase().trim() !== 'INSTALADO');

  const countByCond = {
    A: machines.filter(m => m.condicion === 'A').length,
    B: machines.filter(m => m.condicion === 'B').length,
    C: machines.filter(m => m.condicion === 'C').length,
    D: machines.filter(m => m.condicion === 'D').length,
  };

  const uniqueLocationsInBodega = new Set(
    inBodegaMachines.map(m => m.ubicacion).filter(Boolean)
  ).size;

  const totalMoves = machines.reduce((acc, m) => {
    return acc + ((m.historial && m.historial.length > 1) ? m.historial.length - 1 : 0);
  }, 0);

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
      gap: 16,
      marginBottom: 24
    }}>
      
      {/* Total Machines */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total de Equipos</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2 }}>{totalMachines}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={22} color="#818cf8" />
        </div>
      </div>

      {/* En Bodega / Taller (Dentro) */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>En Bodega / Taller</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#22d3ee' }}>{inBodegaMachines.length}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-subdued)', marginTop: 2 }}>{uniqueLocationsInBodega} estantes/racks</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={22} color="#22d3ee" />
        </div>
      </div>

      {/* Instalados (Fuera de Bodega) */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Instalados (Fuera)</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#34d399' }}>{installedMachines.length}</p>
          <p style={{ fontSize: '0.72rem', color: '#34d399', marginTop: 2, fontWeight: 600 }}>En servicio / Cliente</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={22} color="#34d399" />
        </div>
      </div>

      {/* Condición D (Crítica/Taller) */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Condición D (Revisión)</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#f87171' }}>{countByCond.D}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={22} color="#f87171" />
        </div>
      </div>

      {/* Total Reubicaciones */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Reubicaciones</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#fbbf24' }}>{totalMoves}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <History size={22} color="#fbbf24" />
        </div>
      </div>

    </div>
  );
}
