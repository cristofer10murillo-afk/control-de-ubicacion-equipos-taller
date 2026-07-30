import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import DashboardStats from './components/DashboardStats';
import MachineFilters from './components/MachineFilters';
import MachineTable from './components/MachineTable';
import MoveMachineModal from './components/MoveMachineModal';
import LocationHistoryModal from './components/LocationHistoryModal';
import AddEditMachineModal from './components/AddEditMachineModal';

import { 
  subscribeToMachines, 
  addMachine, 
  moveMachine, 
  updateMachine, 
  deleteMachine 
} from './services/machineService';

export default function App() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Global Quick Search
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filters State
  const [filters, setFilters] = useState({
    modelo: '',
    condicion: '',
    activo: '',
    serie: '',
    ubicacion: ''
  });

  // Active Modals state
  const [movingMachine, setMovingMachine] = useState(null);
  const [historyMachine, setHistoryMachine] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Subscribe to machines (Firestore / LocalStorage)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToMachines((data) => {
      setMachines(data);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Dynamically extract available models & locations for dropdowns
  const availableModels = useMemo(() => {
    const set = new Set(machines.map(m => m.modelo).filter(Boolean));
    return Array.from(set).sort();
  }, [machines]);

  const availableLocations = useMemo(() => {
    const set = new Set(machines.map(m => m.ubicacion).filter(Boolean));
    return Array.from(set).sort();
  }, [machines]);

  // Filter machines based on search + advanced filters
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      // Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchGlobal = 
          (m.modelo && m.modelo.toLowerCase().includes(q)) ||
          (m.activo && m.activo.toLowerCase().includes(q)) ||
          (m.serie && m.serie.toLowerCase().includes(q)) ||
          (m.condicion && m.condicion.toLowerCase().includes(q)) ||
          (m.ubicacion && m.ubicacion.toLowerCase().includes(q)) ||
          (m.responsable && m.responsable.toLowerCase().includes(q));
        if (!matchGlobal) return false;
      }

      // Advanced Filters
      if (filters.modelo && m.modelo !== filters.modelo) return false;
      if (filters.condicion && m.condicion !== filters.condicion) return false;
      if (filters.activo && (!m.activo || !m.activo.toLowerCase().includes(filters.activo.toLowerCase().trim()))) return false;
      if (filters.serie && (!m.serie || !m.serie.toLowerCase().includes(filters.serie.toLowerCase().trim()))) return false;
      if (filters.ubicacion && m.ubicacion !== filters.ubicacion) return false;

      return true;
    });
  }, [machines, searchQuery, filters]);

  // Handlers for machine CRUD & re-location
  const handleSaveMove = async (machineId, newLocation, responsable, notas) => {
    await moveMachine(machineId, newLocation, responsable, notas);
  };

  const handleSaveMachine = async (formData, machineId) => {
    if (machineId) {
      await updateMachine(machineId, formData);
    } else {
      await addMachine(formData);
    }
  };

  const handleDeleteMachine = async (machine) => {
    if (window.confirm(`¿Estás seguro de eliminar la máquina "${machine.modelo}" (Activo: ${machine.activo})?`)) {
      await deleteMachine(machine.id);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({
      modelo: '',
      condicion: '',
      activo: '',
      serie: '',
      ubicacion: ''
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        machines={machines}
      />

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 20px 48px' }}>
        
        {/* KPI Dashboard Cards */}
        <DashboardStats machines={machines} />

        {/* Filters */}
        <MachineFilters 
          filters={filters}
          setFilters={setFilters}
          availableModels={availableModels}
          availableLocations={availableLocations}
          onResetFilters={handleResetFilters}
        />

        {/* Machine Table / Cards list */}
        {loading ? (
          <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Cargando inventario de equipos en tiempo real...</p>
          </div>
        ) : (
          <MachineTable 
            machines={filteredMachines}
            onMoveClick={(m) => setMovingMachine(m)}
            onHistoryClick={(m) => setHistoryMachine(m)}
            onEditClick={(m) => setEditingMachine(m)}
            onDeleteClick={handleDeleteMachine}
          />
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-subdued)', background: 'rgba(11, 15, 25, 0.8)' }}>
        Sistema de Control de Ubicación y Equipos de Taller &copy; {new Date().getFullYear()}
      </footer>

      {/* Modals */}
      {movingMachine && (
        <MoveMachineModal 
          machine={movingMachine}
          onClose={() => setMovingMachine(null)}
          onSave={handleSaveMove}
        />
      )}

      {historyMachine && (
        <LocationHistoryModal 
          machine={historyMachine}
          onClose={() => setHistoryMachine(null)}
        />
      )}

      {(isAddModalOpen || editingMachine) && (
        <AddEditMachineModal 
          machine={editingMachine}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingMachine(null);
          }}
          onSave={handleSaveMachine}
        />
      )}

    </div>
  );
}
