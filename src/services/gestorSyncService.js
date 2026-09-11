import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { gestorDb } from '../firebase/config';
import { updateMachine, addMachine } from './machineService';

/**
 * Clean string for accurate matching (removes special chars, extra spaces, upper case)
 */
const normalizeKey = (str) => {
  if (!str) return '';
  return str.toString().trim().toUpperCase().replace(/[\s\-_]/g, '');
};

/**
 * Check if client string is a valid assigned client name
 */
const isValidClient = (clientStr) => {
  if (!clientStr || typeof clientStr !== 'string') return false;
  const trimmed = clientStr.trim();
  if (!trimmed) return false;
  
  const lower = trimmed.toLowerCase();
  if (['sin cliente', 'sin asignar', 'n/a', 'na', 'tbd', 'pendiente'].includes(lower)) {
    return false;
  }
  if (lower.startsWith('[retirado')) {
    return false;
  }
  return true;
};

/**
 * Helper to get fresh local machines list
 */
const getFreshLocalMachines = () => {
  try {
    const stored = localStorage.getItem('workshop_machines_data');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading local machines:', e);
  }
  return [];
};

/**
 * Process single equipo doc from Gestor PRO into Control de Ubicación
 */
const syncSingleEquipo = async (eq, currentMachines) => {
  if (!eq) return false;

  const eqActivo = normalizeKey(eq.activo);
  const eqSerie = normalizeKey(eq.serie);

  if (!eqActivo && !eqSerie) return false;

  const targetMachine = currentMachines.find(m => {
    const mActivo = normalizeKey(m.activo);
    const mSerie = normalizeKey(m.serie);
    return (eqActivo && eqActivo !== 'NA' && mActivo === eqActivo) ||
           (eqSerie && eqSerie !== 'NA' && mSerie === eqSerie);
  });

  const rawClient = eq.cliente ? eq.cliente.trim() : '';
  const hasValidClient = isValidClient(rawClient);
  const isOperativo = Boolean(eq.equipoOperativo);

  if (targetMachine) {
    const updates = {};
    let changed = false;

    // 1. Client sync & history recording
    if (hasValidClient) {
      if (!targetMachine.clienteAsignado || targetMachine.nombreCliente !== rawClient || targetMachine.condicion !== 'A') {
        const oldClientName = targetMachine.nombreCliente || 'Sin cliente';
        const nowStr = new Date().toLocaleString('es-CR');

        updates.clienteAsignado = true;
        updates.nombreCliente = rawClient;
        updates.condicion = 'A';

        if (targetMachine.nombreCliente !== rawClient) {
          const clientHistEntry = {
            id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fecha: nowStr,
            ubicacionAnterior: targetMachine.ubicacion || 'Bodega/Taller',
            ubicacionNueva: isOperativo ? 'INSTALADO' : (targetMachine.ubicacion || 'Bodega/Taller'),
            responsable: 'Gestor PRO (Auto)',
            notas: targetMachine.clienteAsignado && oldClientName !== 'Sin cliente'
              ? `Reasignación de cliente: Anterior ("${oldClientName}") ➔ Nuevo ("${rawClient}")`
              : `Asignación de cliente: "${rawClient}"`
          };
          updates.historial = [clientHistEntry, ...(updates.historial || targetMachine.historial || [])];
        }

        changed = true;
      }
    } else if (eq.equipoRetirado || (rawClient.toLowerCase().startsWith('[retirado') && targetMachine.clienteAsignado)) {
      const oldClientName = targetMachine.nombreCliente || 'Cliente';
      const nowStr = new Date().toLocaleString('es-CR');

      updates.clienteAsignado = false;
      updates.nombreCliente = '';
      
      const clientHistEntry = {
        id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fecha: nowStr,
        ubicacionAnterior: targetMachine.ubicacion || 'Bodega/Taller',
        ubicacionNueva: targetMachine.ubicacion || 'Bodega/Taller',
        responsable: 'Gestor PRO (Auto)',
        notas: `Cliente retirado / desasignado (Cliente anterior: "${oldClientName}")`
      };
      updates.historial = [clientHistEntry, ...(updates.historial || targetMachine.historial || [])];

      changed = true;
    }

    // 2. Operativo status -> INSTALADO location sync
    if (isOperativo && targetMachine.ubicacion !== 'INSTALADO') {
      const nowStr = new Date().toLocaleString('es-CR');
      const oldLoc = targetMachine.ubicacion || 'Bodega/Taller';
      updates.ubicacion = 'INSTALADO';
      
      const locationHistEntry = {
        id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fecha: nowStr,
        ubicacionAnterior: oldLoc,
        ubicacionNueva: 'INSTALADO',
        responsable: 'Gestor PRO (Auto)',
        notas: `Marcado como Equipo Operativo (Instalado fuera de taller para cliente: ${rawClient || targetMachine.nombreCliente || 'Cliente'})`
      };
      updates.historial = [locationHistEntry, ...(updates.historial || targetMachine.historial || [])];
      
      changed = true;
    }

    if (changed) {
      await updateMachine(targetMachine.id, updates);
      return true;
    }
  } else {
    // Machine exists in Gestor de Equipos PRO but NOT YET in Control de Ubicación -> AUTO-CREATE IT!
    const modelName = (eq.modelo || eq.tipoTrabajo || eq.marcaModelo || 'Equipo Gestor PRO').trim();
    const nowStr = new Date().toLocaleString('es-CR');

    await addMachine({
      modelo: modelName,
      activo: eq.activo ? eq.activo.trim() : 'N/A',
      serie: eq.serie ? eq.serie.trim() : 'N/A',
      condicion: hasValidClient ? 'A' : 'C',
      ubicacion: isOperativo ? 'INSTALADO' : (eq.lugar || eq.terminal || 'BODEGA / TALLER').trim(),
      responsable: eq.tecnico || 'Gestor PRO (Auto)',
      clienteAsignado: hasValidClient,
      nombreCliente: hasValidClient ? rawClient : '',
      notas: `Equipo importado automáticamente desde Gestor de Equipos PRO (${nowStr})`
    });
    return true;
  }

  return false;
};

/**
 * Subscribe to real-time updates from Gestor de Equipos PRO
 */
export const subscribeToGestorProSync = (onStatusChange) => {
  if (!gestorDb) {
    if (onStatusChange) onStatusChange({ active: false, error: 'Sin conexión a Firebase de Gestor PRO' });
    return () => {};
  }

  try {
    const equiposRef = collection(gestorDb, 'equipos');

    // Notify status active immediately on init
    if (onStatusChange) {
      onStatusChange({ active: true, lastSyncTime: new Date().toLocaleTimeString('es-CR') });
    }

    const unsubscribe = onSnapshot(equiposRef, async (snapshot) => {
      let syncCount = 0;
      
      for (const docSnap of snapshot.docs) {
        const eq = docSnap.data();
        const currentMachines = getFreshLocalMachines();
        const updated = await syncSingleEquipo(eq, currentMachines);
        if (updated) syncCount++;
      }

      if (onStatusChange) {
        onStatusChange({
          active: true,
          lastSyncTime: new Date().toLocaleTimeString('es-CR'),
          updatedCount: syncCount
        });
      }
    }, (err) => {
      console.warn('Error in Gestor PRO sync listener:', err);
      if (onStatusChange) onStatusChange({ active: false, error: err.message });
    });

    return unsubscribe;
  } catch (error) {
    console.error('Failed to start Gestor PRO sync:', error);
    if (onStatusChange) onStatusChange({ active: false, error: error.message });
    return () => {};
  }
};

/**
 * Manual sync audit across all machines
 */
export const syncAllFromGestorPro = async () => {
  if (!gestorDb) throw new Error('Conexión a Gestor de Equipos PRO no disponible.');

  const snapshot = await getDocs(collection(gestorDb, 'equipos'));
  let syncedCount = 0;

  for (const docSnap of snapshot.docs) {
    const eq = docSnap.data();
    const currentMachines = getFreshLocalMachines();
    const updated = await syncSingleEquipo(eq, currentMachines);
    if (updated) syncedCount++;
  }

  return syncedCount;
};
