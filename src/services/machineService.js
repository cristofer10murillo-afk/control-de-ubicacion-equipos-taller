import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import initialMachines from '../data/initialMachines.json';

const LOCAL_STORAGE_KEY = 'workshop_machines_data';

// Live in-memory cache synced with Firestore (Single Source of Truth)
let latestMachinesCache = [];

export const getCachedMachines = () => latestMachinesCache;

// Provider registered by gestorSyncService to acknowledge current Gestor PRO operative orders when user moves a machine manually
let gestorOperativeProvider = null;

export const registerGestorOperativeProvider = (providerFn) => {
  gestorOperativeProvider = providerFn;
};

const getAcknowledgedOperativeFields = (machine, targetLocation, nextClienteAsignado = undefined) => {
  const isTargetBodega = String(targetLocation || '').toUpperCase().trim() !== 'INSTALADO';
  const wasInstalled = String(machine?.ubicacion || '').toUpperCase().trim() === 'INSTALADO';
  const wasClientCleared =
    (wasInstalled && isTargetBodega && nextClienteAsignado !== true) ||
    (Boolean(machine?.clienteAsignado) && nextClienteAsignado === false);

  const existingOpIds = Array.isArray(machine?.processedGestorOperativoIds)
    ? machine.processedGestorOperativoIds
    : [];
  const existingDismissedClients = Array.isArray(machine?.dismissedGestorClientKeys)
    ? machine.dismissedGestorClientKeys
    : [];

  const result = {};

  if (typeof gestorOperativeProvider === 'function') {
    const { loaded, operativeIds, clientKeys } = gestorOperativeProvider(machine);

    if (isTargetBodega) {
      result.processedGestorOperativoIds = Array.from(new Set([...existingOpIds, ...(operativeIds || [])]));
      result.acknowledgePendingOperativeOnNextSync = !loaded;
    } else {
      result.acknowledgePendingOperativeOnNextSync = false;
    }

    if (wasClientCleared) {
      result.dismissedGestorClientKeys = Array.from(new Set([...existingDismissedClients, ...(clientKeys || [])]));
      result.acknowledgePendingClientOnNextSync = !loaded;
    } else if (nextClienteAsignado === true) {
      result.acknowledgePendingClientOnNextSync = false;
    }
  } else {
    if (isTargetBodega) {
      result.processedGestorOperativoIds = existingOpIds;
      result.acknowledgePendingOperativeOnNextSync = true;
    } else {
      result.acknowledgePendingOperativeOnNextSync = false;
    }

    if (wasClientCleared) {
      result.dismissedGestorClientKeys = existingDismissedClients;
      result.acknowledgePendingClientOnNextSync = true;
    } else if (nextClienteAsignado === true) {
      result.acknowledgePendingClientOnNextSync = false;
    }
  }

  return result;
};

/**
 * Recursively strip undefined values so Firestore never rejects a write
 */
const stripUndefined = (val) => {
  if (Array.isArray(val)) {
    return val.map(stripUndefined);
  }
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        clean[k] = stripUndefined(v);
      }
    }
    return clean;
  }
  return val;
};

// Helper for local storage persistence
const getLocalMachines = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading local machines:', e);
  }
  // Initialize with initial JSON seed
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialMachines));
  return initialMachines;
};

const getCurrentMachines = () => {
  if (Array.isArray(latestMachinesCache) && latestMachinesCache.length > 0) {
    return latestMachinesCache;
  }
  return getLocalMachines();
};

const saveLocalMachines = (machines) => {
  latestMachinesCache = machines;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(machines));
  } catch (e) {
    console.error('Error saving local machines:', e);
  }
};

/**
 * Helper to sort machines: newest updated / created first
 */
const sortMachines = (list) => {
  return [...list].sort((a, b) => {
    const idA = typeof a.excelId === 'number' ? a.excelId : 0;
    const idB = typeof b.excelId === 'number' ? b.excelId : 0;
    return idB - idA;
  });
};

/**
 * Extract a numeric recency key so deduplication always preserves the newest record
 */
const getRecencyKey = (m) => {
  if (!m) return 0;
  if (Array.isArray(m.historial) && m.historial.length > 0 && m.historial[0]?.id) {
    const match = String(m.historial[0].id).match(/HIST-(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  if (typeof m.excelId === 'number') return m.excelId;
  return 0;
};

/**
 * Deduplicate machines array by ID, Activo, and Serie (pure in-memory, never deletes from Firestore)
 * Keeps the most recently updated entry and skips older duplicates
 */
export const deduplicateMachines = (list) => {
  const ordered = [...list].sort((a, b) => getRecencyKey(b) - getRecencyKey(a));
  const seenIds = new Set();
  const seenActivos = new Map();
  const seenSeries = new Map();
  const result = [];

  for (const m of ordered) {
    if (!m || !m.id) continue;
    if (seenIds.has(m.id)) continue;

    const actClean = String(m.activo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const serClean = String(m.serie || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Check Activo duplicate (excluding N/A, SIN RESPUESTA, NUEVA)
    if (actClean && actClean !== 'NA' && !actClean.includes('SINRESPUESTA') && actClean !== 'NUEVA') {
      if (seenActivos.has(actClean)) {
        console.warn(`[Deduplicate] Found duplicate Activo "${m.activo}" (ID: ${m.id}). Keeping newest (${seenActivos.get(actClean)}).`);
        continue;
      }
      seenActivos.set(actClean, m.id);
    }

    // Check Serie duplicate (excluding N/A, SIN RESPUESTA)
    if (serClean && serClean !== 'NA' && !serClean.includes('SINRESPUESTA')) {
      if (seenSeries.has(serClean)) {
        console.warn(`[Deduplicate] Found duplicate Serie "${m.serie}" (ID: ${m.id}). Keeping newest (${seenSeries.get(serClean)}).`);
        continue;
      }
      seenSeries.set(serClean, m.id);
    }

    seenIds.add(m.id);
    result.push(m);
  }

  return result;
};

/**
 * Helper to generate a deterministic, unique Firestore Document ID
 */
const generateDeterministicId = (activo, serie) => {
  const cleanAct = String(activo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanSer = String(serie || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleanAct && cleanAct !== 'NA' && !cleanAct.includes('SINRESPUESTA') && cleanAct !== 'NUEVA') {
    return `DOC-ACT-${cleanAct}`;
  }
  if (cleanSer && cleanSer !== 'NA' && !cleanSer.includes('SINRESPUESTA')) {
    return `DOC-SER-${cleanSer}`;
  }
  return `EQ-${Date.now().toString().slice(-6)}`;
};

/**
 * Subscribe to real-time machine updates (Firestore as Single Source of Truth + Deduplication)
 */
export const subscribeToMachines = (callback) => {
  if (isFirebaseConfigured && db) {
    const machinesRef = collection(db, 'maquinas');
    
    const unsubscribe = onSnapshot(machinesRef, (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is empty, auto-seed to Firestore so data is preserved in cloud
        const localMachines = getLocalMachines();
        seedMachinesToFirebase(localMachines).catch(err => {
          console.warn('Auto-seed to Firestore failed:', err);
        });
        callback(sortMachines(deduplicateMachines(localMachines)));
      } else {
        const firestoreList = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        // Deduplicate and sort Firestore list (Single Source of Truth)
        const deduplicated = deduplicateMachines(firestoreList);
        const sorted = sortMachines(deduplicated);
        
        saveLocalMachines(sorted); // Sync LocalStorage cache with cloud truth
        callback(sorted);
      }
    }, (error) => {
      console.warn('Firestore subscription error, fallback to local:', error);
      const localData = getLocalMachines();
      callback(sortMachines(deduplicateMachines(localData)));
    });

    return unsubscribe;
  } else {
    // LocalStorage fallback mode
    const localData = getLocalMachines();
    const cleanLocal = deduplicateMachines(localData);
    callback(sortMachines(cleanLocal));
    
    const handleStorage = () => {
      const updated = getLocalMachines();
      callback(sortMachines(deduplicateMachines(updated)));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
};

/**
 * Add a new machine with deterministic Document ID
 */
export const addMachine = async (newMachineData) => {
  const localList = getCurrentMachines();
  
  // Calculate next excelId for sequence
  const maxExcelId = localList.reduce((max, m) => Math.max(max, Number(m.excelId) || 0), 0);
  const nextExcelId = maxExcelId + 1;

  const newId = generateDeterministicId(newMachineData.activo, newMachineData.serie);
  const nowStr = new Date().toLocaleString('es-CR');

  const ackFields = getAcknowledgedOperativeFields(
    { activo: newMachineData.activo, serie: newMachineData.serie, processedGestorOperativoIds: [], dismissedGestorClientKeys: [] },
    newMachineData.ubicacion,
    Boolean(newMachineData.clienteAsignado)
  );

  const machineObj = stripUndefined({
    id: newId,
    excelId: nextExcelId,
    modelo: String(newMachineData.modelo || '').trim(),
    activo: newMachineData.activo ? String(newMachineData.activo).trim() : 'N/A',
    serie: newMachineData.serie ? String(newMachineData.serie).trim() : 'N/A',
    condicion: newMachineData.condicion || 'C',
    ubicacion: String(newMachineData.ubicacion || '').trim(),
    responsable: newMachineData.responsable ? String(newMachineData.responsable).trim() : 'Sistema',
    clienteAsignado: Boolean(newMachineData.clienteAsignado),
    nombreCliente: newMachineData.nombreCliente ? String(newMachineData.nombreCliente).trim() : '',
    comentarios: newMachineData.comentarios ? String(newMachineData.comentarios).trim() : '',
    fechaIngreso: nowStr,
    fechaActualizacion: nowStr,
    ...ackFields,
    historial: [
      {
        id: `HIST-${Date.now()}`,
        fecha: nowStr,
        ubicacionAnterior: 'N/A (Alta de Equipo)',
        ubicacionNueva: String(newMachineData.ubicacion || '').trim(),
        responsable: newMachineData.responsable ? String(newMachineData.responsable).trim() : 'Sistema',
        notas: newMachineData.notas || 'Creación inicial del registro de equipo'
      }
    ]
  });

  // 1. Save to Firestore using deterministic ID
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', newId);
      await setDoc(docRef, machineObj, { merge: true });
    } catch (e) {
      console.error('Error writing new machine to Firestore:', e);
      throw new Error('No se pudo guardar en la nube (Firestore). Verifica tu conexión a internet.');
    }
  }

  // 2. Save to cache & LocalStorage
  const updatedList = deduplicateMachines([machineObj, ...localList]);
  const sorted = sortMachines(updatedList);
  saveLocalMachines(sorted);

  return machineObj;
};

/**
 * Change machine location and record location history
 */
export const moveMachine = async (machineId, newLocation, responsable, notas, clienteAsignado, nombreCliente) => {
  const localList = getCurrentMachines();
  const machine = localList.find(m => m.id === machineId);
  if (!machine) throw new Error('Máquina no encontrada');

  const nowStr = new Date().toLocaleString('es-CR');
  const oldLocation = String(machine.ubicacion || 'Sin ubicación');
  const cleanNewLocation = String(newLocation || '').trim();
  const cleanResponsable = responsable ? String(responsable).trim() : String(machine.responsable || 'Sin especificar');

  const wasInstalled = oldLocation.toUpperCase().trim() === 'INSTALADO';
  const isTargetBodega = cleanNewLocation.toUpperCase().trim() !== 'INSTALADO';
  const prevClientName = String(machine.nombreCliente || '').trim();
  const incomingClientName = nombreCliente ? String(nombreCliente).trim() : '';

  // When a machine returns from INSTALADO into Bodega/Taller, automatically clear its previous client
  // (unless the user explicitly assigned a brand-new, different client name during the move)
  let finalClienteAsignado = typeof clienteAsignado === 'boolean' ? clienteAsignado : Boolean(machine.clienteAsignado);
  let finalNombreCliente = typeof clienteAsignado === 'boolean' ? (clienteAsignado ? incomingClientName : '') : prevClientName;

  if (wasInstalled && isTargetBodega) {
    const isSameOldClient =
      prevClientName &&
      incomingClientName.toUpperCase() === prevClientName.toUpperCase();
    if (!finalClienteAsignado || isSameOldClient || !incomingClientName) {
      finalClienteAsignado = false;
      finalNombreCliente = '';
    }
  }

  let finalNota = notas ? String(notas).trim() : 'Cambio de ubicación en taller/bodega';
  if (wasInstalled && isTargetBodega && !finalClienteAsignado && prevClientName) {
    finalNota = `${finalNota} (Cliente anterior "${prevClientName}" eliminado al ingresar a bodega)`;
  }

  const newHistoryEntry = {
    id: `HIST-${Date.now()}`,
    fecha: nowStr,
    ubicacionAnterior: oldLocation,
    ubicacionNueva: cleanNewLocation,
    responsable: cleanResponsable,
    notas: finalNota
  };

  const updatedHistory = [newHistoryEntry, ...(Array.isArray(machine.historial) ? machine.historial : [])];

  // Acknowledge current Gestor PRO operative order AND dismissed client so neither is reverted on reload
  const ackFields = getAcknowledgedOperativeFields(machine, cleanNewLocation, finalClienteAsignado);

  const updatedFields = stripUndefined({
    ubicacion: cleanNewLocation,
    responsable: cleanResponsable,
    clienteAsignado: finalClienteAsignado,
    nombreCliente: finalNombreCliente,
    fechaActualizacion: nowStr,
    historial: updatedHistory,
    ...ackFields
  });

  const fullMergedMachine = stripUndefined({ ...machine, ...updatedFields });

  // 1. Persist to Firestore FIRST with setDoc(..., { merge: true }) so it works reliably even if doc was missing
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', machineId);
      await setDoc(docRef, fullMergedMachine, { merge: true });
    } catch (e) {
      console.error('Error updating move in Firestore:', e);
      throw new Error('No se pudo guardar la nueva ubicación en la nube (Firestore). Verifica tu conexión a internet.');
    }
  }

  // 2. Update local cache & LocalStorage
  const updatedList = localList.map(m => m.id === machineId ? fullMergedMachine : m);
  saveLocalMachines(sortMachines(deduplicateMachines(updatedList)));

  return updatedFields;
};

/**
 * Edit existing machine fields
 */
export const updateMachine = async (machineId, fields) => {
  const localList = getCurrentMachines();
  const machine = localList.find(m => m.id === machineId);
  if (!machine) throw new Error('Máquina no encontrada');

  const { _fromGestorSync, ...cleanInputFields } = fields || {};
  const nowStr = new Date().toLocaleString('es-CR');

  // If user manually edited ubicacion or clienteAsignado, acknowledge current Gestor PRO operative/client state
  let ackFields = {};
  if (!_fromGestorSync) {
    const nextLoc = cleanInputFields.ubicacion !== undefined ? cleanInputFields.ubicacion : machine.ubicacion;
    const prevLocUpper = String(machine.ubicacion || '').trim().toUpperCase();
    const nextLocUpper = String(nextLoc || '').trim().toUpperCase();

    // If user switched an INSTALADO machine into bodega via Edit modal without changing to a new client, clear old client
    if (prevLocUpper === 'INSTALADO' && nextLocUpper !== 'INSTALADO') {
      const prevClientName = String(machine.nombreCliente || '').trim();
      const nextClientName = String(cleanInputFields.nombreCliente || '').trim();
      if (
        cleanInputFields.clienteAsignado === false ||
        !nextClientName ||
        (prevClientName && nextClientName.toUpperCase() === prevClientName.toUpperCase())
      ) {
        cleanInputFields.clienteAsignado = false;
        cleanInputFields.nombreCliente = '';
      }
    }

    const nextClienteAsignado =
      cleanInputFields.clienteAsignado !== undefined
        ? Boolean(cleanInputFields.clienteAsignado)
        : Boolean(machine.clienteAsignado);

    if (
      cleanInputFields.ubicacion !== undefined ||
      cleanInputFields.clienteAsignado !== undefined
    ) {
      ackFields = getAcknowledgedOperativeFields(machine, nextLoc, nextClienteAsignado);
    }
  }

  const updatedFields = stripUndefined({
    ...cleanInputFields,
    ...ackFields,
    fechaActualizacion: nowStr
  });

  const fullMergedMachine = stripUndefined({ ...machine, ...updatedFields });

  // 1. Persist to Firestore with setDoc(..., { merge: true })
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', machineId);
      await setDoc(docRef, fullMergedMachine, { merge: true });
    } catch (e) {
      console.error('Error updating machine in Firestore:', e);
      throw new Error('No se pudo actualizar el equipo en la nube (Firestore). Verifica tu conexión a internet.');
    }
  }

  // 2. Update local cache & LocalStorage
  const updatedList = localList.map(m => m.id === machineId ? fullMergedMachine : m);
  saveLocalMachines(sortMachines(deduplicateMachines(updatedList)));

  return updatedFields;
};

/**
 * Delete a machine
 */
export const deleteMachine = async (machineId) => {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', machineId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Error deleting machine in Firestore:', e);
      throw new Error('No se pudo eliminar el equipo en la nube (Firestore).');
    }
  }

  const localList = getCurrentMachines();
  const updatedList = localList.filter(m => m.id !== machineId);
  saveLocalMachines(updatedList);
};

/**
 * Sync / Seed all machines to Firebase Firestore (Bulk import)
 */
export const seedMachinesToFirebase = async (machinesList = null) => {
  const dataToSeed = machinesList || getLocalMachines();
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase no está configurado.');
  }

  const batchSize = 400;
  for (let i = 0; i < dataToSeed.length; i += batchSize) {
    const chunk = dataToSeed.slice(i, i + batchSize);
    const batch = writeBatch(db);
    
    chunk.forEach(m => {
      const docRef = doc(db, 'maquinas', m.id);
      batch.set(docRef, m, { merge: true });
    });

    await batch.commit();
  }

  return dataToSeed.length;
};

/**
 * Reset local storage to initial Excel dataset
 */
export const resetToInitialSeed = () => {
  saveLocalMachines(initialMachines);
  return initialMachines;
};
