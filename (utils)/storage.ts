// utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveToStorage = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving data to storage", error);
  }
};

export const loadFromStorage = async (key: string): Promise<any | null> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading data from storage", error);
    return null;
  }
};

export const removeFromStorage = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing data from storage", error);
  }
};
