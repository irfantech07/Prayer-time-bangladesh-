export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export interface PrayerData {
  timings: PrayerTimes;
  date: {
    readable: string;
    timestamp: string;
    hijri: {
      date: string;
      day: string;
      month: {
        number: number;
        en: string;
        ar: string;
      };
      year: string;
      designation: {
        expanded: string;
      };
    };
    gregorian: {
      date: string;
      day: string;
      month: {
        number: number;
        en: string;
      };
      year: string;
    };
  };
}

export interface City {
  name: string;
  value: string;
}

export const BANGLADESH_CITIES: City[] = [
  { name: "Dhaka", value: "Dhaka" },
  { name: "Chittagong", value: "Chittagong" },
  { name: "Sylhet", value: "Sylhet" },
  { name: "Rajshahi", value: "Rajshahi" },
  { name: "Khulna", value: "Khulna" },
  { name: "Barisal", value: "Barisal" },
  { name: "Rangpur", value: "Rangpur" },
  { name: "Mymensingh", value: "Mymensingh" },
  { name: "Comilla", value: "Comilla" },
  { name: "Narayanganj", value: "Narayanganj" },
  { name: "Gazipur", value: "Gazipur" },
];
