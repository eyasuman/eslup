export type MapLocationKind = "provider" | "institute";

export interface MapLocation {
  id: string;
  kind: MapLocationKind;
  name: string;
  lat?: number | null;
  lng?: number | null;
  subtitle?: string;
  city?: string;
  rating?: number;
  available?: boolean;
  serviceModes?: {
    video?: boolean;
    audio?: boolean;
    inPerson?: boolean;
    homeVisit?: boolean;
  };
  availability?: any[];
}

export function isValidLocationCoordinates(lat: unknown, lng: unknown): lat is number {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return lat !== 0 && lng !== 0;
}

export function getMapLocationKey(location: Pick<MapLocation, "id" | "kind">) {
  return `${location.kind}:${location.id}`;
}

export function isMapLocationAvailable(location: MapLocation) {
  if (location.kind === "institute") return true;
  if (location.available === true) return true;
  if (location.serviceModes?.inPerson || location.serviceModes?.video) return true;
  return Boolean(location.availability?.length);
}