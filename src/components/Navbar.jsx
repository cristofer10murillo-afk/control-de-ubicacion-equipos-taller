import React from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Search,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PWAInstallPrompt from './PWAInstallPrompt';

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  onOpenAddModal,
  machines
}) {
  // Export current inventory directly to Excel
  const handleExportExcel = () => {
    if (!machines || machines.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const exportData = machines.map((m, i) => ({
      Id: i + 1,
      'Modelo / Tipo': m.modelo,
      'N° Activo': m.activo,
      'N° Serie': m.serie,
      Condicion: m.condicion,
      Ubicacion: m.ubicacion,
      Responsable: m.responsable,
      'Correo electrónico': m.correo,
      'Fecha Ingreso': m.fechaIngreso,
      'Última Reubicación': m.fechaActualizacion || m.fechaIngreso,
      'Total Reubicaciones': m.historial ? m.historial.length : 1
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario Bodega');
    XLSX.writeFile(workbook, `Inventario_Maquinas_Bodega_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <header className="glass-card" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 40, padding: '14px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img 
            src="/pwa-192x192.png" 
            alt="Logo App" 
            style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }} 
          />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Control de Ubicación de Equipos
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Taller & Bodega | Tiempo Real
            </p>
          </div>
        </div>

        {/* Global Quick Search */}
        <div style={{ flex: '1 1 260px', maxWidth: 420, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subdued)' }} />
          <input 
            type="text"
            className="input-control"
            placeholder="Buscar por activo, serie, modelo, condición o ubicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 42, background: 'rgba(15, 23, 42, 0.9)' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          
          {/* PWA Install Button */}
          <PWAInstallPrompt />

          {/* Export to Excel Button */}
          <button 
            onClick={handleExportExcel}
            className="btn btn-secondary"
            title="Exportar inventario actual a un archivo Excel (.xlsx)"
            style={{ fontSize: '0.82rem' }}
          >
            <FileSpreadsheet size={17} color="#10b981" />
            <span>Exportar Excel</span>
          </button>

          {/* Add Machine Button */}
          <button 
            onClick={onOpenAddModal}
            className="btn btn-primary"
          >
            <Plus size={18} />
            <span>+ Agregar Equipo</span>
          </button>

        </div>

      </div>
    </header>
  );
}
