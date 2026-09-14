import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

export type CapturedDeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: number;
};

export type DeviceLocationErrorCode =
  | "permission-denied"
  | "permission-blocked"
  | "services-disabled"
  | "unavailable";

export class DeviceLocationError extends Error {
  constructor(
    public readonly code: DeviceLocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DeviceLocationError";
  }
}

function getWebLocation(): Promise<CapturedDeviceLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new DeviceLocationError(
      "unavailable",
      "Location is not available in this browser.",
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: position.timestamp,
        });
      },
      (error) => {
        const blocked = error.code === error.PERMISSION_DENIED;
        reject(
          new DeviceLocationError(
            blocked ? "permission-blocked" : "unavailable",
            blocked
              ? "Location permission was denied in your browser."
              : "Your current location could not be determined. Turn on location services and try again.",
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export async function captureCurrentDeviceLocation(): Promise<CapturedDeviceLocation> {
  if (Platform.OS === "web") {
    return getWebLocation();
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new DeviceLocationError(
      "services-disabled",
      "Turn on your device location services, then try again.",
    );
  }

  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!permission.granted) {
    throw new DeviceLocationError(
      permission.canAskAgain ? "permission-denied" : "permission-blocked",
      permission.canAskAgain
        ? "Location permission is required to continue."
        : "Location permission is blocked. Open device settings and allow location access for PULSE.",
    );
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      mayShowUserSettingsDialog: true,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      capturedAt: position.timestamp,
    };
  } catch {
    throw new DeviceLocationError(
      "unavailable",
      "Your current location could not be determined. Move to an open area, turn on precise location, and try again.",
    );
  }
}

export async function openLocationSettings() {
  if (Platform.OS === "web") return;
  try {
    await Linking.openSettings();
  } catch {
    throw new DeviceLocationError(
      "unavailable",
      "Device settings could not be opened. Open Settings manually and allow location access for PULSE.",
    );
  }
}