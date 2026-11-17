import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { gestorDb } from '../firebase/config';
import { updateMachine, getCachedMachines } from './machineService';

/**
 * Clean string for accurate matching (removes special chars, extra spaces, upper case)
 */
const normalizeKey = (str) => {
  if (!str) return '';
  return str.toString().trim().toUpperCase().replace(/[\s\-_]/g, '');
};

/**
 * Robust boolean parser for Firestore values
 */
const parseBool = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'si' || s === 'sí';
  }
  return Boolean(val);
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
 * Helper to get fresh machines list (prefers live in-memory Firestore cache, falls back to localStorage)
 */
const getFreshLocalMachines = () => {
  const cached = getCachedMachines();
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
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
 * Rules:
 * - Syncs Modelo / Tipo de Equipo (if valid and different).
 * - Syncs Cliente Asignado, Nombre de Cliente, and Condición A when equipo has a valid client and is LISTO/OPERATIVO.
 * - NEVER modifies or overwrites targetMachine.ubicacion (physical workshop/installed location is controlled strictly by Control de Ubicación).
 */
const syncSingleEquipo = async (eq, currentMachines) => {
  if (!eq) return false;

  const eqActivo = normalizeKey(eq.activo);
  const eqSerie = normalizeKey(eq.serie);

  if (!eqActivo && !eqSerie) return false;

  const eqComentario = String(eq.comentario || eq.comentarios || '').trim();
  const rawClient = eq.cliente ? eq.cliente.trim() : '';

  // Detect retired equipment in Gestor PRO (including '[RETIRADO...]' in comment)
  const isRetirado = parseBool(eq.equipoRetirado) || 
                     eqComentario.toLowerCase().includes('retirado') || 
                     rawClient.toLowerCase().startsWith('[retirado');

  // Skip syncing retired records from Gestor PRO
  if (isRetirado) {
    return false;
  }

  const isListo = parseBool(eq.equipoListo);
  const isOperativo = parseBool(eq.equipoOperativo) || String(eq.estado || '').toLowerCase() === 'operativo';
  const hasValidClient = isValidClient(rawClient);

  // Match existing machine by Activo or Serie
  const targetMachine = currentMachines.find(m => {
    const mActivo = normalizeKey(m.activo);
    const mSerie = normalizeKey(m.serie);
    return (eqActivo && eqActivo !== 'NA' && mActivo === eqActivo) ||
           (eqSerie && eqSerie !== 'NA' && mSerie === eqSerie);
  });

  const shouldSyncClientAndCondition = (isListo || isOperativo || hasValidClient) && hasValidClient;

  // Determine machine type from Gestor PRO (tipoEquipo || modelo || marcaModelo)
  const eqTipoModelo = (eq.tipoEquipo || eq.modelo || eq.marcaModelo || '').trim();

  if (targetMachine) {
    const updates = {};
    let changed = false;

    // Sync Modelo / Tipo de Equipo if present in Gestor PRO and valid
    if (eqTipoModelo && eqTipoModelo.toUpperCase() !== 'PENDIENTE' && targetMachine.modelo !== eqTipoModelo) {
      updates.modelo = eqTipoModelo;
      changed = true;
    }

    // RULE 1: Sincronizar Cliente y Condición A cuando el equipo tiene cliente asignado en Gestor PRO
    // IMPORTANTE: Nunca sobreescribir `ubicacion` — las ubicaciones físicas se gestionan exclusivamente en esta app.
    if (shouldSyncClientAndCondition) {
      if (!targetMachine.clienteAsignado || targetMachine.nombreCliente !== rawClient || targetMachine.condicion !== 'A') {
        const oldClientName = targetMachine.nombreCliente || 'Sin cliente';
        const nowStr = new Date().toLocaleString('es-CR');
        const currentLocation = targetMachine.ubicacion || 'Bodega/Taller';

        updates.clienteAsignado = true;
        updates.nombreCliente = rawClient;
        updates.condicion = 'A';

        if (targetMachine.nombreCliente !== rawClient) {
          const clientHistEntry = {
            id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fecha: nowStr,
            ubicacionAnterior: currentLocation,
            ubicacionNueva: currentLocation,
            responsable: 'Gestor PRO (Auto)',
            notas: targetMachine.clienteAsignado && oldClientName !== 'Sin cliente'
              ? `Reasignación de cliente: Anterior ("${oldClientName}") ➔ Nuevo ("${rawClient}") [Equipo Listo]`
              : `Asignación de cliente en Equipos Listos: "${rawClient}"`
          };
          updates.historial = [clientHistEntry, ...(updates.historial || targetMachine.historial || [])];
        }

        changed = true;
      }
    }

    if (changed) {
      await updateMachine(targetMachine.id, updates);
      return true;
    }
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
