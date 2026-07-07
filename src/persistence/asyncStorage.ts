import AsyncStorage from '@react-native-async-storage/async-storage';

import { createRunPersistence } from './index';
import { createCatalogPersistence } from './catalog';
import { createDailyPersistence } from './daily';

export const asyncStorageRunPersistence = createRunPersistence(AsyncStorage);
export const asyncStorageCatalogPersistence = createCatalogPersistence(AsyncStorage);
export const asyncStorageDailyPersistence = createDailyPersistence(AsyncStorage);
