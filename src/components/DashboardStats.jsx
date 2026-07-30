import React from 'react';
import { 
  Package, 
  MapPin, 
  History, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

export default function DashboardStats({ machines }) {
  const totalMachines = machines.length;

  const countByCond = {
    A: machines.filter(m => m.condicion === 'A').length,
    B: machines.filter(m => m.condicion === 'B').length,
    C: machines.filter(m => m.condicion === 'C').length,
    D: machines.filter(m => m.condicion === 'D').length,
  };

  const uniqueLocations = new Set(machines.map(m => m.ubicacion).filter(Boolean)).size;

  const totalMoves = machines.reduce((acc, m) => {
    return acc + ((m.historial && m.historial.length > 1) ? m.historial.length - 1 : 0);
  }, 0);

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
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

      {/* Condición D (Alerta/Taller) */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Condición D (Crítica)</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#f87171' }}>{countByCond.D}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={22} color="#f87171" />
        </div>
      </div>

      {/* Condición C / Regular */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Condición C (Regular)</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#fbbf24' }}>{countByCond.C}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HelpCircle size={22} color="#fbbf24" />
        </div>
      </div>

      {/* Ubicaciones Únicas */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ubicaciones Activas</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#22d3ee' }}>{uniqueLocations}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapPin size={22} color="#22d3ee" />
        </div>
      </div>

      {/* Historial de Movimientos */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Reubicaciones Realizadas</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 2, color: '#34d399' }}>{totalMoves}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <History size={22} color="#34d399" />
        </div>
      </div>

    </div>
  );
}
