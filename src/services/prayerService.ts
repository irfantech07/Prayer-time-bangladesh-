import { PrayerData } from "../types";

export async function getPrayerTimes(city: string): Promise<PrayerData> {
  const response = await fetch(
    `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Bangladesh&method=1`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch prayer times");
  }
  const data = await response.json();
  return data.data;
}

export async function getPrayerTimesByCoords(latitude: number, longitude: number): Promise<PrayerData> {
  const response = await fetch(
    `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=1`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch prayer times by coordinates");
  }
  const data = await response.json();
  return data.data;
}

export async function getQiblaDirection(latitude: number, longitude: number): Promise<number> {
  const response = await fetch(
    `https://api.aladhan.com/v1/qibla/${latitude}/${longitude}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch Qibla direction");
  }
  const data = await response.json();
  return data.data.direction;
}
