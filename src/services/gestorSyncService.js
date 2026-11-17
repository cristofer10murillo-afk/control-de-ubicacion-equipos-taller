import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { gestorDb } from '../firebase/config';
import {
  updateMachine,
  getCachedMachines,
  registerGestorOperativeProvider
} from './machineService';

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
 * Detect if a Gestor PRO record represents a retired machine
 */
const isRetiredRecord = (eq) => {
  const eqComentario = String(eq?.comentario || eq?.comentarios || '').trim();
  const rawClient = eq?.cliente ? String(eq.cliente).trim() : '';
  return (
    parseBool(eq?.equipoRetirado) ||
    eqComentario.toLowerCase().includes('retirado') ||
    rawClient.toLowerCase().startsWith('[retirado')
  );
};

/**
 * Detect if a Gestor PRO record is marked OPERATIVO
 */
const isOperativeRecord = (eq) => {
  return parseBool(eq?.equipoOperativo) || String(eq?.estado || '').toLowerCase() === 'operativo';
};

/**
 * Extract numeric timestamp from a Gestor PRO work order so we always prioritize the NEWEST order per machine
 */
const getOrderTimestamp = (eq) => {
  if (!eq) return 0;
  if (typeof eq.createdAt === 'number' && !isNaN(eq.createdAt)) return eq.createdAt;
  if (eq.createdAt && typeof eq.createdAt.toMillis === 'function') return eq.createdAt.toMillis();
  const fin = Date.parse(eq.fechaFin || '');
  if (!isNaN(fin)) return fin;
  const ini = Date.parse(eq.fechaInicio || '');
  if (!isNaN(ini)) return ini;
  return 0;
};

// In-memory indexes of currently operative Gestor PRO doc IDs and active client keys per machine key (activo / serie)
let gestorSnapshotLoaded = false;
const operativeIdsByKey = new Map();
const clientKeysByKey = new Map();

const rebuildOperativeIndex = (docEntries) => {
  operativeIdsByKey.clear();
  clientKeysByKey.clear();
  for (const { id, data: eq } of docEntries) {
    if (!eq || isRetiredRecord(eq)) continue;
    const eqActivo = normalizeKey(eq.activo);
    const eqSerie = normalizeKey(eq.serie);
    const rawClient = eq.cliente ? String(eq.cliente).trim() : '';
    const hasValidClient = isValidClient(rawClient);
    const clientKey = hasValidClient ? `${id}::${normalizeKey(rawClient)}` : '';
    const isOp = isOperativeRecord(eq);

    if (eqActivo && eqActivo !== 'NA') {
      const k = `ACT:${eqActivo}`;
      if (isOp) {
        if (!operativeIdsByKey.has(k)) operativeIdsByKey.set(k, new Set());
        operativeIdsByKey.get(k).add(id);
      }
      if (clientKey) {
        if (!clientKeysByKey.has(k)) clientKeysByKey.set(k, new Set());
        clientKeysByKey.get(k).add(clientKey);
      }
    }
    if (eqSerie && eqSerie !== 'NA') {
      const k = `SER:${eqSerie}`;
      if (isOp) {
        if (!operativeIdsByKey.has(k)) operativeIdsByKey.set(k, new Set());
        operativeIdsByKey.get(k).add(id);
      }
      if (clientKey) {
        if (!clientKeysByKey.has(k)) clientKeysByKey.set(k, new Set());
        clientKeysByKey.get(k).add(clientKey);
      }
    }
  }
  gestorSnapshotLoaded = true;
};

// Register provider so manual moves in machineService.js immediately acknowledge current operative & client records
registerGestorOperativeProvider((machine) => {
  const opIds = new Set();
  const cKeys = new Set();
  const mActivo = normalizeKey(machine?.activo);
  const mSerie = normalizeKey(machine?.serie);

  if (mActivo && mActivo !== 'NA') {
    const opSet = operativeIdsByKey.get(`ACT:${mActivo}`);
    if (opSet) opSet.forEach(id => opIds.add(id));
    const cSet = clientKeysByKey.get(`ACT:${mActivo}`);
    if (cSet) cSet.forEach(ck => cKeys.add(ck));
  }
  if (mSerie && mSerie !== 'NA') {
    const opSet = operativeIdsByKey.get(`SER:${mSerie}`);
    if (opSet) opSet.forEach(id => opIds.add(id));
    const cSet = clientKeysByKey.get(`SER:${mSerie}`);
    if (cSet) cSet.forEach(ck => cKeys.add(ck));
  }

  return {
    loaded: gestorSnapshotLoaded,
    operativeIds: Array.from(opIds),
    clientKeys: Array.from(cKeys)
  };
});

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
 * Process the LATEST Gestor PRO work order for a machine into Control de Ubicación.
 * Rules:
 * 1. Syncs Modelo / Tipo de Equipo (if valid and different).
 * 2. Syncs Cliente Asignado, Nombre de Cliente, and Condición A when equipo has a valid client and is LISTO/OPERATIVO.
 * 3. Smart Operative Auto-Exit:
 *    - When a machine is in Bodega/Taller and its latest Gestor PRO order becomes OPERATIVO (with a doc ID NOT yet processed),
 *      automatically moves it out of Bodega -> INSTALADO and records the order ID as processed.
 *    - If the user later returns/moves that machine manually to Bodega/Taller, the order ID remains in processedGestorOperativoIds,
 *      so reopening the app will NEVER revert the manual workshop location back to INSTALADO.
 *    - If a NEW order (new doc ID) becomes OPERATIVO later, or the order is unchecked (false) and re-checked (true),
 *      it triggers auto-exit cleanly again.
 */
const syncSingleEquipo = async (gestorDocId, eq, currentMachines, processedTargetIds) => {
  if (!eq || !gestorDocId) return { updated: false, visibleChange: false };

  const eqActivo = normalizeKey(eq.activo);
  const eqSerie = normalizeKey(eq.serie);

  if (!eqActivo && !eqSerie) return { updated: false, visibleChange: false };

  // Skip syncing retired records from Gestor PRO
  if (isRetiredRecord(eq)) {
    return { updated: false, visibleChange: false };
  }

  // Match existing machine by Activo or Serie
  const targetMachine = currentMachines.find(m => {
    const mActivo = normalizeKey(m.activo);
    const mSerie = normalizeKey(m.serie);
    return (eqActivo && eqActivo !== 'NA' && mActivo === eqActivo) ||
           (eqSerie && eqSerie !== 'NA' && mSerie === eqSerie);
  });

  if (!targetMachine) return { updated: false, visibleChange: false };

  // Ensure each machine is only evaluated against its single NEWEST non-retired Gestor PRO order
  if (processedTargetIds && processedTargetIds.has(targetMachine.id)) {
    return { updated: false, visibleChange: false };
  }
  if (processedTargetIds) {
    processedTargetIds.add(targetMachine.id);
  }

  const rawClient = eq.cliente ? String(eq.cliente).trim() : '';
  const isListo = parseBool(eq.equipoListo);
  const isOperativo = isOperativeRecord(eq);
  const hasValidClient = isValidClient(rawClient);
  const shouldSyncClientAndCondition = (isListo || isOperativo || hasValidClient) && hasValidClient;
  const eqTipoModelo = (eq.tipoEquipo || eq.modelo || eq.marcaModelo || '').trim();

  const updates = {};
  let changed = false;
  let visibleChange = false;

  // Sync Modelo / Tipo de Equipo if present in Gestor PRO and valid
  if (eqTipoModelo && eqTipoModelo.toUpperCase() !== 'PENDIENTE' && targetMachine.modelo !== eqTipoModelo) {
    updates.modelo = eqTipoModelo;
    changed = true;
    visibleChange = true;
  }

  // RULE 1 (Smart Client Sync): Sincronizar Cliente y Condición A cuando el equipo tiene un cliente activo/nuevo en Gestor PRO,
  // respetando clientes anteriores que fueron eliminados al devolver la máquina a bodega.
  const existingDismissedClientKeys = Array.isArray(targetMachine.dismissedGestorClientKeys)
    ? targetMachine.dismissedGestorClientKeys
    : [];
  const currentClientKey = hasValidClient ? `${gestorDocId}::${normalizeKey(rawClient)}` : '';

  if (shouldSyncClientAndCondition && currentClientKey) {
    const isClientDismissed = existingDismissedClientKeys.includes(currentClientKey);

    if (targetMachine.acknowledgePendingClientOnNextSync) {
      // User returned machine to bodega / cleared client before Gestor PRO loaded;
      // silently dismiss this old client so it is NEVER re-assigned.
      updates.dismissedGestorClientKeys = Array.from(new Set([...existingDismissedClientKeys, currentClientKey]));
      updates.acknowledgePendingClientOnNextSync = false;
      changed = true;
    } else if (!isClientDismissed) {
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
        visibleChange = true;
      }
    }
  } else if (targetMachine.acknowledgePendingClientOnNextSync) {
    updates.acknowledgePendingClientOnNextSync = false;
    changed = true;
  }

  // Release stale dismissed client keys for this order if Gestor PRO changed/cleared its client
  const staleDismissedForOrder = existingDismissedClientKeys.filter(
    k => k.startsWith(`${gestorDocId}::`) && k !== currentClientKey
  );
  if (staleDismissedForOrder.length > 0) {
    const base = updates.dismissedGestorClientKeys || existingDismissedClientKeys;
    updates.dismissedGestorClientKeys = base.filter(k => !staleDismissedForOrder.includes(k));
    changed = true;
  }

  // RULE 2 (Smart Operative Auto-Exit):
  // Move out of Bodega -> INSTALADO ONLY for NEW (unprocessed) operative transitions,
  // never reverting manual workshop returns.
  const existingProcessedIds = Array.isArray(targetMachine.processedGestorOperativoIds)
    ? targetMachine.processedGestorOperativoIds
    : [];
  const currentLocUpper = String(targetMachine.ubicacion || '').toUpperCase().trim();
  const isCurrentlyInstalled = currentLocUpper === 'INSTALADO';

  if (isOperativo) {
    const alreadyProcessed = existingProcessedIds.includes(gestorDocId);

    if (targetMachine.acknowledgePendingOperativeOnNextSync) {
      // User moved machine into workshop/bodega before Gestor PRO loaded;
      // silently mark this operative order as acknowledged so it won't overwrite the user's location.
      updates.processedGestorOperativoIds = Array.from(new Set([...existingProcessedIds, gestorDocId]));
      updates.acknowledgePendingOperativeOnNextSync = false;
      changed = true;
    } else if (isCurrentlyInstalled) {
      // Machine is already INSTALADO: record gestorDocId silently so a future manual return to workshop is protected.
      if (!alreadyProcessed) {
        updates.processedGestorOperativoIds = Array.from(new Set([...existingProcessedIds, gestorDocId]));
        changed = true;
      }
    } else if (!alreadyProcessed) {
      // Machine is in Bodega/Taller AND this is a NEW operative order in Gestor PRO -> Auto-move to INSTALADO!
      const nowStr = new Date().toLocaleString('es-CR');
      const oldLoc = targetMachine.ubicacion || 'Bodega/Taller';

      updates.ubicacion = 'INSTALADO';
      updates.processedGestorOperativoIds = Array.from(new Set([...existingProcessedIds, gestorDocId]));
      updates.acknowledgePendingOperativeOnNextSync = false;

      const locationHistEntry = {
        id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fecha: nowStr,
        ubicacionAnterior: oldLoc,
        ubicacionNueva: 'INSTALADO',
        responsable: 'Gestor PRO (Auto)',
        notas: `Equipo promovido a OPERATIVO en Gestor PRO (Instalado fuera de taller para cliente: ${rawClient || targetMachine.nombreCliente || 'Cliente'})`
      };
      updates.historial = [locationHistEntry, ...(updates.historial || targetMachine.historial || [])];

      changed = true;
      visibleChange = true;
    }
  } else {
    // Latest order is NOT operative in Gestor PRO:
    // If this order was previously processed as operative, release it so re-marking it OPERATIVO later will trigger again.
    if (existingProcessedIds.includes(gestorDocId)) {
      updates.processedGestorOperativoIds = existingProcessedIds.filter(id => id !== gestorDocId);
      changed = true;
    }
    if (targetMachine.acknowledgePendingOperativeOnNextSync) {
      updates.acknowledgePendingOperativeOnNextSync = false;
      changed = true;
    }
  }

  if (changed) {
    await updateMachine(targetMachine.id, { ...updates, _fromGestorSync: true });
    return { updated: true, visibleChange };
  }

  return { updated: false, visibleChange: false };
};

/**
 * Process a full list of Gestor PRO documents sorted newest-first
 */
const processGestorDocs = async (snapshotDocs) => {
  const entries = snapshotDocs.map(docSnap => ({
    id: docSnap.id,
    data: docSnap.data()
  }));

  // 1. Update live operative index for manual move acknowledgements
  rebuildOperativeIndex(entries);

  // 2. Sort newest work order first so stale historical orders never override newer ones
  entries.sort((a, b) => getOrderTimestamp(b.data) - getOrderTimestamp(a.data));

  const processedTargetIds = new Set();
  let visibleSyncCount = 0;

  for (const { id, data: eq } of entries) {
    const currentMachines = getFreshLocalMachines();
    const { visibleChange } = await syncSingleEquipo(id, eq, currentMachines, processedTargetIds);
    if (visibleChange) visibleSyncCount++;
  }

  return visibleSyncCount;
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
      try {
        const syncCount = await processGestorDocs(snapshot.docs);

        if (onStatusChange) {
          onStatusChange({
            active: true,
            lastSyncTime: new Date().toLocaleTimeString('es-CR'),
            updatedCount: syncCount
          });
        }
      } catch (err) {
        console.warn('Error processing Gestor PRO snapshot:', err);
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
  return await processGestorDocs(snapshot.docs);
};
