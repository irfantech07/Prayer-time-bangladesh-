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
