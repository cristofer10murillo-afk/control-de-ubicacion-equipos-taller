import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, Download, RefreshCw, Flame, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { isFirebaseConfigured } from '../firebase/config';
import { seedMachinesToFirebase, resetToInitialSeed } from '../services/machineService';

export default function ExcelImportModal({ machines, onClose, onRefreshData }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // One click sync / seed to Firebase
  const handleSyncToFirebase = async () => {
    try {
      setIsProcessing(true);
      setStatusMsg('Enviando máquinas a Firebase Firestore en lotes...');
      const total = await seedMachinesToFirebase();
      setStatusMsg(`¡Éxito! ${total} máquinas han sido sincronizadas en Firebase Firestore.`);
      setTimeout(() => {
        onRefreshData();
      }, 1500);
    } catch (err) {
      setStatusMsg('Error al sincronizar con Firebase: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to original 148 excel seed
  const handleResetToExcelSeed = () => {
    if (window.confirm('¿Deseas restaurar la base de datos local con las 148 máquinas originales del Excel?')) {
      resetToInitialSeed();
      setStatusMsg('Base de datos restaurada con las 148 máquinas iniciales.');
      onRefreshData();
    }
  };

  // Export current machines list to XLSX
  const handleExportExcel = () => {
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
      'Total Reubicaciones': m.historial ? m.historial.length : 1
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ubicacion Maquinas');
    XLSX.writeFile(workbook, `Ubicacion_Maquinas_Bodega_${new Date().toISOString().split('T')[0]}.xlsx`);
    setStatusMsg('Archivo Excel exportado exitosamente.');
  };

  // Handle custom file drag/drop or input upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        setStatusMsg('Leyendo archivo Excel...');
        const bstr = event.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet);

        setStatusMsg(`Procesando ${rawRows.length} filas del Excel...`);
        // We will notify user
        setStatusMsg(`Leídos ${rawRows.length} registros desde el Excel. Se importarán...`);
      } catch (err) {
        setStatusMsg('Error al procesar archivo Excel: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={20} color="var(--accent-emerald)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Gestión de Excel & Firebase</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Importar, exportar y sincronizar inventario de taller</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Firebase Seed Option */}
          {isFirebaseConfigured ? (
            <div className="glass-panel" style={{ padding: 16, border: '1px solid rgba(249, 115, 22, 0.3)', background: 'rgba(249, 115, 22, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Flame size={20} color="#f97316" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f97316' }}>Sincronizar Datos con Firebase Firestore</h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Tienes Firebase configurado. Haz clic abajo para subir masivamente las 148 máquinas y sus historiales a la nube en Firestore.
              </p>
              <button 
                onClick={handleSyncToFirebase} 
                className="btn btn-primary"
                disabled={isProcessing}
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', width: '100%' }}
              >
                <Flame size={16} />
                <span>{isProcessing ? 'Sincronizando...' : 'Subir 148 Máquinas a Firestore'}</span>
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 14, background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ℹ️ Los 148 registros del archivo Excel <strong>Ubicacion de Maquinas en Bodega.xlsx</strong> ya se encuentran cargados en el sistema local.
              </p>
            </div>
          )}

          {/* Export to Excel Button */}
          <div className="glass-panel" style={{ padding: 16 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Exportar Inventario Actual</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Descarga la lista actual de {machines.length} equipos con sus ubicaciones y datos en formato Excel (.xlsx).
            </p>
            <button 
              onClick={handleExportExcel}
              className="btn btn-accent"
              style={{ width: '100%' }}
            >
              <Download size={16} />
              <span>Descargar Inventario (.xlsx)</span>
            </button>
          </div>

          {/* Upload Custom Excel File */}
          <div className="glass-panel" style={{ padding: 16 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Cargar Archivo Excel Personalizado</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Selecciona un nuevo archivo `.xlsx` o `.xls` para actualizar el inventario.
            </p>
            <input 
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)' }}
            />
          </div>

          {/* Reset to Seed Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
            <button 
              onClick={handleResetToExcelSeed}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              <RefreshCw size={14} />
              <span>Restaurar 148 Máquinas de Excel</span>
            </button>

            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: 10, borderRadius: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} />
              <span>{statusMsg}</span>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
