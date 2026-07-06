import AsyncStorage from '@react-native-async-storage/async-storage';

import { createRunPersistence } from './index';

export const asyncStorageRunPersistence = createRunPersistence(AsyncStorage);
