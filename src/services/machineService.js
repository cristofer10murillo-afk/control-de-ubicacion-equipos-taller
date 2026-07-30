import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import initialMachines from '../data/initialMachines.json';

const LOCAL_STORAGE_KEY = 'workshop_machines_data';

// Helper for local storage persistence
const getLocalMachines = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading local machines:', e);
  }
  // Initialize with initial JSON seed
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialMachines));
  return initialMachines;
};

const saveLocalMachines = (machines) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(machines));
};

/**
 * Subscribe to real-time machine updates (Firestore or LocalStorage fallback)
 */
export const subscribeToMachines = (callback) => {
  if (isFirebaseConfigured && db) {
    const machinesRef = collection(db, 'maquinas');
    const unsubscribe = onSnapshot(machinesRef, (snapshot) => {
      if (snapshot.empty) {
        // If Firestore collection is empty, trigger callback with initial local data
        callback(getLocalMachines());
      } else {
        const machinesList = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        // Sort by excelId or numeric sequence
        machinesList.sort((a, b) => (a.excelId || 9999) - (b.excelId || 9999));
        callback(machinesList);
      }
    }, (error) => {
      console.warn('Firestore subscription error, using local storage:', error);
      callback(getLocalMachines());
    });
    return unsubscribe;
  } else {
    // LocalStorage fallback mode
    const localData = getLocalMachines();
    callback(localData);
    
    // Listen for storage events across tabs
    const handleStorage = () => callback(getLocalMachines());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
};

/**
 * Add a new machine
 */
export const addMachine = async (newMachineData) => {
  const newId = `EQ-${Date.now().toString().slice(-6)}`;
  const nowStr = new Date().toLocaleString('es-CR');

  const machineObj = {
    id: newId,
    excelId: Date.now(),
    modelo: newMachineData.modelo.trim(),
    activo: newMachineData.activo ? newMachineData.activo.trim() : 'N/A',
    serie: newMachineData.serie ? newMachineData.serie.trim() : 'N/A',
    condicion: newMachineData.condicion || 'C',
    ubicacion: newMachineData.ubicacion.trim(),
    responsable: newMachineData.responsable ? newMachineData.responsable.trim() : 'Sistema',
    correo: newMachineData.correo ? newMachineData.correo.trim() : '',
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

  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'maquinas', newId);
    await setDoc(docRef, machineObj);
  }

  // Always update LocalStorage
  const localList = getLocalMachines();
  const updatedList = [machineObj, ...localList];
  saveLocalMachines(updatedList);

  return machineObj;
};

/**
 * Change machine location and record location history
 */
export const moveMachine = async (machineId, newLocation, responsable, notas) => {
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

  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'maquinas', machineId);
    await updateDoc(docRef, updatedFields);
  }

  // Update local
  const updatedList = localList.map(m => m.id === machineId ? { ...m, ...updatedFields } : m);
  saveLocalMachines(updatedList);

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

  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'maquinas', machineId);
    await updateDoc(docRef, updatedFields);
  }

  const updatedList = localList.map(m => m.id === machineId ? { ...m, ...updatedFields } : m);
  saveLocalMachines(updatedList);

  return updatedFields;
};

/**
 * Delete a machine
 */
export const deleteMachine = async (machineId) => {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, 'maquinas', machineId);
    await deleteDoc(docRef);
  }

  const localList = getLocalMachines();
  const updatedList = localList.filter(m => m.id !== machineId);
  saveLocalMachines(updatedList);
};

/**
 * Sync / Seed all machines to Firebase Firestore (Bulk import)
 */
export const seedMachinesToFirebase = async (machinesList = null) => {
  const dataToSeed = machinesList || getLocalMachines();
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase no está configurado aún. Ingresa tus credenciales primero.');
  }

  // Process in batches of 400 (Firestore limit is 500)
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
