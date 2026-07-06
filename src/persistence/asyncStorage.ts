import AsyncStorage from '@react-native-async-storage/async-storage';

import { createRunPersistence } from './index';
import { createCatalogPersistence } from './catalog';

export const asyncStorageRunPersistence = createRunPersistence(AsyncStorage);
export const asyncStorageCatalogPersistence = createCatalogPersistence(AsyncStorage);
