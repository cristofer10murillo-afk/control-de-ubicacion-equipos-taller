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
    // Extract numerical sequence or date
    const idA = typeof a.excelId === 'number' ? a.excelId : 0;
    const idB = typeof b.excelId === 'number' ? b.excelId : 0;
    
    // Sort by excelId descending (newest at top) or fallback
    return idB - idA;
  });
};

/**
 * Subscribe to real-time machine updates (Firestore + LocalStorage merged safety)
 */
export const subscribeToMachines = (callback) => {
  if (isFirebaseConfigured && db) {
    const machinesRef = collection(db, 'maquinas');
    
    const unsubscribe = onSnapshot(machinesRef, (snapshot) => {
      const localMachines = getLocalMachines();

      if (snapshot.empty) {
        // If Firestore is empty, auto-seed to Firestore so data is preserved in cloud
        seedMachinesToFirebase(localMachines).catch(err => {
          console.warn('Auto-seed to Firestore failed:', err);
        });
        callback(sortMachines(localMachines));
      } else {
        const firestoreList = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        // Merge Firestore docs + local machines (so nothing is ever lost if Firestore was partially seeded)
        const firestoreIds = new Set(firestoreList.map(m => m.id));
        const combined = [
          ...firestoreList,
          ...localMachines.filter(m => !firestoreIds.has(m.id))
        ];

        const sorted = sortMachines(combined);
        saveLocalMachines(sorted); // Cache merged state
        callback(sorted);
      }
    }, (error) => {
      console.warn('Firestore subscription error, fallback to local:', error);
      callback(sortMachines(getLocalMachines()));
    });

    return unsubscribe;
  } else {
    // LocalStorage fallback mode
    const localData = getLocalMachines();
    callback(sortMachines(localData));
    
    const handleStorage = () => callback(sortMachines(getLocalMachines()));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
};

/**
 * Add a new machine
 */
export const addMachine = async (newMachineData) => {
  const localList = getLocalMachines();
  
  // Calculate next excelId for sequence
  const maxExcelId = localList.reduce((max, m) => Math.max(max, Number(m.excelId) || 0), 0);
  const nextExcelId = maxExcelId + 1;

  const newId = `EQ-${Date.now().toString().slice(-6)}`;
  const nowStr = new Date().toLocaleString('es-CR');

  const machineObj = {
    id: newId,
    excelId: nextExcelId,
    modelo: newMachineData.modelo.trim(),
    activo: newMachineData.activo ? newMachineData.activo.trim() : 'N/A',
    serie: newMachineData.serie ? newMachineData.serie.trim() : 'N/A',
    condicion: newMachineData.condicion || 'C',
    ubicacion: newMachineData.ubicacion.trim(),
    responsable: newMachineData.responsable ? newMachineData.responsable.trim() : 'Sistema',
    clienteAsignado: Boolean(newMachineData.clienteAsignado),
    nombreCliente: newMachineData.nombreCliente ? newMachineData.nombreCliente.trim() : '',
    fechaIngreso: nowStr,
    fechaActualizacion: nowStr,
    historial: [
      {
        id: `HIST-${Date.now()}`,
        fecha: nowStr,
        ubicacionAnterior: 'N/A (Alta de Equipo)',
        ubicacionNueva: newMachineData.ubicacion.trim(),
        responsable: newMachineData.responsable ? newMachineData.responsable.trim() : 'Sistema',
        notas: newMachineData.notas || 'Creación inicial del registro de equipo'
      }
    ]
  };

  // 1. Save to LocalStorage immediately so user sees it at the top
  const updatedList = [machineObj, ...localList];
  const sorted = sortMachines(updatedList);
  saveLocalMachines(sorted);

  // 2. Save to Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'maquinas', newId);
      await setDoc(docRef, machineObj);
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
    ubicacionNueva: newLocation.trim(),
    responsable: responsable ? responsable.trim() : 'Sin especificar',
    notas: notas ? notas.trim() : 'Cambio de ubicación en taller/bodega'
  };

  const updatedHistory = [newHistoryEntry, ...(machine.historial || [])];

  const updatedFields = {
    ubicacion: newLocation.trim(),
    responsable: responsable ? responsable.trim() : machine.responsable,
    fechaActualizacion: nowStr,
    historial: updatedHistory
  };

  if (typeof clienteAsignado === 'boolean') {
    updatedFields.clienteAsignado = clienteAsignado;
    updatedFields.nombreCliente = nombreCliente ? nombreCliente.trim() : '';
  }

  // Update local
  const updatedList = localList.map(m => m.id === machineId ? { ...m, ...updatedFields } : m);
  saveLocalMachines(sortMachines(updatedList));

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
  saveLocalMachines(sortMachines(updatedList));

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
