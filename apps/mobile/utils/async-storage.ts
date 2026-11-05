import AsyncStorage from "@react-native-async-storage/async-storage";

/** Typed JSON wrappers around AsyncStorage. Errors are logged, never thrown. */

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error setting item:", error);
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value != null ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.error("Error getting item:", error);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing item:", error);
  }
}
