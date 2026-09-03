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

/** Converts database/form coordinate values without accepting partial numbers such as "9abc". */
export function normalizeLocationCoordinate(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = Number(value.trim());
  return Number.isFinite(normalized) ? normalized : undefined;
}

export function isValidLocationCoordinates(lat: unknown, lng: unknown): lat is number {
  const normalizedLat = normalizeLocationCoordinate(lat);
  const normalizedLng = normalizeLocationCoordinate(lng);
  if (normalizedLat == null || normalizedLng == null) return false;
  if (normalizedLat < -90 || normalizedLat > 90 || normalizedLng < -180 || normalizedLng > 180) return false;
  return normalizedLat !== 0 && normalizedLng !== 0;
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