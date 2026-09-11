import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { gestorDb } from '../firebase/config';
import { updateMachine } from './machineService';

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
 * Subscribe to real-time updates from Gestor de Equipos PRO
 */
export const subscribeToGestorProSync = (onStatusChange) => {
  if (!gestorDb) {
    if (onStatusChange) onStatusChange({ active: false, error: 'Sin conexión a Firebase de Gestor PRO' });
    return () => {};
  }

  try {
    const equiposRef = collection(gestorDb, 'equipos');

    const unsubscribe = onSnapshot(equiposRef, (snapshot) => {
      let syncCount = 0;
      
      // Get current local machines from localStorage cache
      const stored = localStorage.getItem('workshop_machines_data');
      if (!stored) return;
      const currentMachines = JSON.parse(stored);

      // Create lookup maps for fast matching by Activo and Serie
      const machineByActivo = new Map();
      const machineBySerie = new Map();

      currentMachines.forEach(m => {
        const normActivo = normalizeKey(m.activo);
        const normSerie = normalizeKey(m.serie);

        if (normActivo && normActivo !== 'NA') machineByActivo.set(normActivo, m);
        if (normSerie && normSerie !== 'NA') machineBySerie.set(normSerie, m);
      });

      snapshot.docs.forEach(docSnap => {
        const eq = docSnap.data();
        if (!eq) return;

        const eqActivo = normalizeKey(eq.activo);
        const eqSerie = normalizeKey(eq.serie);

        const targetMachine = (eqActivo && machineByActivo.get(eqActivo)) || 
                              (eqSerie && machineBySerie.get(eqSerie));

        if (targetMachine) {
          const rawClient = eq.cliente ? eq.cliente.trim() : '';
          const hasValidClient = isValidClient(rawClient);

          if (hasValidClient) {
            // Update client name if changed or newly assigned
            if (!targetMachine.clienteAsignado || targetMachine.nombreCliente !== rawClient) {
              updateMachine(targetMachine.id, {
                clienteAsignado: true,
                nombreCliente: rawClient
              });
              syncCount++;
            }
          } else if (eq.equipoRetirado || (rawClient.toLowerCase().startsWith('[retirado') && targetMachine.clienteAsignado)) {
            // If retired in Gestor PRO and currently assigned in Taller, unassign
            updateMachine(targetMachine.id, {
              clienteAsignado: false,
              nombreCliente: ''
            });
            syncCount++;
          }
        }
      });

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
  const stored = localStorage.getItem('workshop_machines_data');
  if (!stored) return 0;
  const currentMachines = JSON.parse(stored);

  const machineByActivo = new Map();
  const machineBySerie = new Map();

  currentMachines.forEach(m => {
    const normActivo = normalizeKey(m.activo);
    const normSerie = normalizeKey(m.serie);

    if (normActivo && normActivo !== 'NA') machineByActivo.set(normActivo, m);
    if (normSerie && normSerie !== 'NA') machineBySerie.set(normSerie, m);
  });

  let syncedCount = 0;

  snapshot.docs.forEach(docSnap => {
    const eq = docSnap.data();
    if (!eq) return;

    const eqActivo = normalizeKey(eq.activo);
    const eqSerie = normalizeKey(eq.serie);

    const targetMachine = (eqActivo && machineByActivo.get(eqActivo)) || 
                          (eqSerie && machineBySerie.get(eqSerie));

    if (targetMachine) {
      const rawClient = eq.cliente ? eq.cliente.trim() : '';
      if (isValidClient(rawClient)) {
        if (!targetMachine.clienteAsignado || targetMachine.nombreCliente !== rawClient) {
          updateMachine(targetMachine.id, {
            clienteAsignado: true,
            nombreCliente: rawClient
          });
          syncedCount++;
        }
      }
    }
  });

  return syncedCount;
};
