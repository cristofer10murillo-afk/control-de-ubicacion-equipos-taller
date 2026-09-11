import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import initialMachines from '../data/initialMachines.json';

const LOCAL_STORAGE_KEY = 'workshop_machines_data';

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

const saveLocalMachines = (machines) => {
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
 * Deduplicate machines array by ID, Activo, and Serie
 * Keeps the most recently updated entry and eliminates duplicates
 */
export const deduplicateMachines = (list) => {
  const seenIds = new Set();
  const seenActivos = new Map();
  const seenSeries = new Map();
  const result = [];

  for (const m of list) {
    if (!m || !m.id) continue;
    if (seenIds.has(m.id)) continue;

    const actClean = String(m.activo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const serClean = String(m.serie || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Check Activo duplicate (excluding N/A, SIN RESPUESTA, NUEVA)
    if (actClean && actClean !== 'NA' && !actClean.includes('SINRESPUESTA') && actClean !== 'NUEVA') {
      if (seenActivos.has(actClean)) {
        console.warn(`[Deduplicate] Found duplicate Activo "${m.activo}" (ID: ${m.id}). Skipping older duplicate.`);
        // Clean up duplicate from Firestore in background if configured
        if (isFirebaseConfigured && db) {
          deleteDoc(doc(db, 'maquinas', m.id)).catch(() => {});
        }
        continue;
      }
      seenActivos.set(actClean, m.id);
    }

    // Check Serie duplicate (excluding N/A, SIN RESPUESTA)
    if (serClean && serClean !== 'NA' && !serClean.includes('SINRESPUESTA')) {
      if (seenSeries.has(serClean)) {
        console.warn(`[Deduplicate] Found duplicate Serie "${m.serie}" (ID: ${m.id}). Skipping older duplicate.`);
        if (isFirebaseConfigured && db) {
          deleteDoc(doc(db, 'maquinas', m.id)).catch(() => {});
        }
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
  const localList = getLocalMachines();
  
  // Calculate next excelId for sequence
  const maxExcelId = localList.reduce((max, m) => Math.max(max, Number(m.excelId) || 0), 0);
  const nextExcelId = maxExcelId + 1;

  const newId = generateDeterministicId(newMachineData.activo, newMachineData.serie);
  const nowStr = new Date().toLocaleString('es-CR');

  const machineObj = {
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
  };

  // 1. Save to LocalStorage immediately
  const updatedList = deduplicateMachines([machineObj, ...localList]);
  const sorted = sortMachines(updatedList);
  saveLocalMachines(sorted);

  // 2. Save to Firestore using deterministic ID
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', newId);
      await setDoc(docRef, machineObj, { merge: true });
    } catch (e) {
      console.error('Error writing new machine to Firestore:', e);
    }
  }

  return machineObj;
};

/**
 * Change machine location and record location history
 */
export const moveMachine = async (machineId, newLocation, responsable, notas, clienteAsignado, nombreCliente) => {
  const localList = getLocalMachines();
  const machine = localList.find(m => m.id === machineId);
  if (!machine) throw new Error('Máquina no encontrada');

  const nowStr = new Date().toLocaleString('es-CR');
  const oldLocation = machine.ubicacion;

  const newHistoryEntry = {
    id: `HIST-${Date.now()}`,
    fecha: nowStr,
    ubicacionAnterior: oldLocation,
    ubicacionNueva: String(newLocation || '').trim(),
    responsable: responsable ? String(responsable).trim() : 'Sin especificar',
    notas: notas ? String(notas).trim() : 'Cambio de ubicación en taller/bodega'
  };

  const updatedHistory = [newHistoryEntry, ...(machine.historial || [])];

  const updatedFields = {
    ubicacion: String(newLocation || '').trim(),
    responsable: responsable ? String(responsable).trim() : machine.responsable,
    fechaActualizacion: nowStr,
    historial: updatedHistory
  };

  if (typeof clienteAsignado === 'boolean') {
    updatedFields.clienteAsignado = clienteAsignado;
    updatedFields.nombreCliente = nombreCliente ? String(nombreCliente).trim() : '';
  }

  // Update local
  const updatedList = localList.map(m => m.id === machineId ? { ...m, ...updatedFields } : m);
  saveLocalMachines(sortMachines(deduplicateMachines(updatedList)));

  // Sync to Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', machineId);
      await updateDoc(docRef, updatedFields);
    } catch (e) {
      console.error('Error updating move in Firestore:', e);
    }
  }

  return updatedFields;
};

/**
 * Edit existing machine fields
 */
export const updateMachine = async (machineId, fields) => {
  const localList = getLocalMachines();
  const machine = localList.find(m => m.id === machineId);
  if (!machine) throw new Error('Máquina no encontrada');

  const nowStr = new Date().toLocaleString('es-CR');
  const updatedFields = {
    ...fields,
    fechaActualizacion: nowStr
  };

  const updatedList = localList.map(m => m.id === machineId ? { ...m, ...updatedFields } : m);
  saveLocalMachines(sortMachines(deduplicateMachines(updatedList)));

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', machineId);
      await updateDoc(docRef, updatedFields);
    } catch (e) {
      console.error('Error updating machine in Firestore:', e);
    }
  }

  return updatedFields;
};

/**
 * Delete a machine
 */
export const deleteMachine = async (machineId) => {
  const localList = getLocalMachines();
  const updatedList = localList.filter(m => m.id !== machineId);
  saveLocalMachines(updatedList);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', machineId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error('Error deleting machine in Firestore:', e);
    }
  }
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
