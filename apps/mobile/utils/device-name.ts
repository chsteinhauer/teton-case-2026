import * as Device from "expo-device";

/** Display name for this phone in channels. */
export const deviceName = Device.deviceName ?? Device.modelName ?? "Unknown device";
