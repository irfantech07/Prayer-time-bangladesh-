/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon, 
  Moon, 
  Sun, 
  Sunrise, 
  Sunset, 
  ChevronDown,
  RefreshCw,
  Navigation,
  HelpCircle,
  Search,
  X
} from 'lucide-react';
import { format, parse, isAfter, addMinutes, differenceInSeconds } from 'date-fns';
import { getPrayerTimes, getPrayerTimesByCoords } from './services/prayerService';
import { PrayerData, BANGLADESH_CITIES, City } from './types';
import { cn } from './lib/utils';

const PRAYER_NAMES = {
  Fajr: "Fajr",
  Sunrise: "Sunrise",
  Dhuhr: "Dhuhr",
  Asr: "Asr",
  Maghrib: "Maghrib",
  Isha: "Isha",
};

export default function App() {
  const [city, setCity] = useState<City>(BANGLADESH_CITIES[0]);
  const [data, setData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredCities = useMemo(() => {
    return BANGLADESH_CITIES.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const fetchData = async (cityName?: string, coords?: { lat: number; lng: number }) => {
    setLoading(true);
    setError(null);
    try {
      let prayerData: PrayerData;
      if (coords) {
        prayerData = await getPrayerTimesByCoords(coords.lat, coords.lng);
        // Try to get location name from timezone if possible, or just use "Current Location"
        setLocationName(prayerData.meta.timezone);
      } else if (cityName) {
        prayerData = await getPrayerTimes(cityName);
        setLocationName(null);
      } else {
        return;
      }

      setData(prayerData);
    } catch (err) {
      setError("Failed to load prayer times. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsUsingLocation(true);
        fetchData(undefined, { lat: latitude, lng: longitude });
        setIsCityMenuOpen(false);
      },
      (err) => {
        setError("Unable to retrieve your location. Please select a city manually.");
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    if (!isUsingLocation) {
      fetchData(city.value);
    }
  }, [city, isUsingLocation]);

  const activePrayerInfo = useMemo(() => {
    if (!data) return null;

    const now = currentTime;
    const timings = data.timings;
    
    // Define all boundaries
    const schedule = [
      { name: 'Fajr', start: timings.Fajr, end: timings.Sunrise },
      { name: 'Sunrise', start: timings.Sunrise, end: timings.Dhuhr },
      { name: 'Dhuhr', start: timings.Dhuhr, end: timings.Asr },
      { name: 'Asr', start: timings.Asr, end: timings.Maghrib },
      { name: 'Maghrib', start: timings.Maghrib, end: timings.Isha },
      { name: 'Isha', start: timings.Isha, end: timings.Fajr },
    ];

    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      let startDate = parse(item.start, 'HH:mm', now);
      let endDate = parse(item.end, 'HH:mm', now);

      // Handle overnight Isha -> Fajr
      if (item.name === 'Isha' && isAfter(startDate, endDate)) {
        if (isAfter(now, startDate)) {
          endDate = addMinutes(endDate, 24 * 60);
        } else {
          startDate = addMinutes(startDate, -24 * 60);
        }
      }

      if (isAfter(now, startDate) && isAfter(endDate, now)) {
        // This is the current "period"
        // If it's Sunrise, the "Current Prayer" is technically none, but we'll show the next one
        if (item.name === 'Sunrise') {
          return { label: 'Next Prayer', name: 'Dhuhr', time: timings.Dhuhr, date: endDate };
        }
        
        // For actual prayers, we show the current one and time until it ends (which is the next prayer's start)
        return { label: 'Current Prayer', name: item.name, time: item.start, date: endDate };
      }
    }

    // Fallback (shouldn't happen with the above schedule)
    return { label: 'Next Prayer', name: 'Fajr', time: timings.Fajr, date: parse(timings.Fajr, 'HH:mm', now) };
  }, [data, currentTime]);

  const timeRemaining = useMemo(() => {
    if (!activePrayerInfo) return null;
    const diff = differenceInSeconds(activePrayerInfo.date, currentTime);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return { hours, minutes, seconds };
  }, [activePrayerInfo, currentTime]);

  const formatTime12h = (time24h: string) => {
    try {
      return format(parse(time24h, 'HH:mm', new Date()), 'h:mm a');
    } catch (e) {
      return time24h;
    }
  };

  const getPrayerRange = (key: string) => {
    if (!data) return { start: '', end: '' };
    const timings = data.timings;
    
    switch (key) {
      case 'Fajr':
        return { start: timings.Fajr, end: timings.Sunrise };
      case 'Dhuhr':
        return { start: timings.Dhuhr, end: timings.Asr };
      case 'Asr':
        return { start: timings.Asr, end: timings.Maghrib };
      case 'Maghrib':
        return { start: timings.Maghrib, end: timings.Isha };
      case 'Isha':
        return { start: timings.Isha, end: timings.Fajr }; // Technically ends at Fajr next day
      default:
        return { start: timings[key as keyof typeof timings], end: '' };
    }
  };

  const getForbiddenTimes = () => {
    if (!data) return [];
    const timings = data.timings;
    const now = new Date();
    
    const sunrise = parse(timings.Sunrise, 'HH:mm', now);
    const dhuhr = parse(timings.Dhuhr, 'HH:mm', now);
    const maghrib = parse(timings.Maghrib, 'HH:mm', now);

    return [
      { 
        name: 'After Sunrise', 
        start: timings.Sunrise, 
        end: format(addMinutes(sunrise, 15), 'HH:mm'),
        description: '15 mins after sunrise',
        explanation: 'It is forbidden to pray when the sun is rising until it has risen high, as it is the time when the sun rises between the two horns of Satan.'
      },
      { 
        name: 'Zenith (Zawal)', 
        start: format(addMinutes(dhuhr, -10), 'HH:mm'), 
        end: timings.Dhuhr,
        description: '10 mins before Dhuhr',
        explanation: 'It is forbidden to pray when the sun is at its highest point in the sky until it has passed the meridian, as this is the time when Hellfire is fueled.'
      },
      { 
        name: 'Before Sunset', 
        start: format(addMinutes(maghrib, -15), 'HH:mm'), 
        end: timings.Maghrib,
        description: '15 mins before Maghrib',
        explanation: 'It is forbidden to pray when the sun is setting until it has completely set, as it sets between the two horns of Satan.'
      }
    ];
  };

  const getPrayerIcon = (name: string) => {
    switch (name) {
      case 'Fajr': return <Sunrise className="w-5 h-5" />;
      case 'Sunrise': return <Sun className="w-5 h-5" />;
      case 'Dhuhr': return <Sun className="w-5 h-5" />;
      case 'Asr': return <Sun className="w-5 h-5" />;
      case 'Maghrib': return <Sunset className="w-5 h-5" />;
      case 'Isha': return <Moon className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-4xl mx-auto">
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center"
          >
            <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-primary font-medium">Loading prayer times...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 px-6 py-3 rounded-full shadow-lg z-[110] flex items-center gap-3">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => fetchData(city.value)} className="hover:bg-red-100 p-1 rounded-full transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="w-full flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="text-center md:text-left">
          <h1 className="serif text-4xl md:text-5xl font-medium text-primary mb-2">Prayer Times</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500">
            <CalendarIcon className="w-4 h-4" />
            <span>{format(currentTime, 'EEEE, MMMM do, yyyy')}</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="font-medium text-gray-600">
              {data ? `${data.date.hijri.day} ${data.date.hijri.month.en} ${data.date.hijri.year}` : '...'}
            </span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-primary font-medium">{format(currentTime, 'h:mm:ss a')}</span>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => {
              setIsCityMenuOpen(!isCityMenuOpen);
              if (!isCityMenuOpen) setSearchTerm('');
            }}
            className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">{isUsingLocation ? (locationName || "Current Location") : city.name}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isCityMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isCityMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col z-50 overflow-hidden"
              >
                {/* Use My Location Button */}
                <button
                  onClick={handleUseLocation}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-primary/5 text-primary font-medium border-b border-gray-50 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span className="text-sm">Use My Location</span>
                </button>

                {/* Search Input */}
                <div className="p-3 border-bottom border-gray-100 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search city..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      autoFocus
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* City List */}
                <div className="max-h-64 overflow-y-auto py-1">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          setCity(c);
                          setIsUsingLocation(false);
                          setIsCityMenuOpen(false);
                          setSearchTerm('');
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors text-sm",
                          city.value === c.value && "text-primary font-semibold bg-secondary"
                        )}
                      >
                        {c.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-xs text-gray-400">No cities found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Next Prayer Card */}
        <section className="lg:col-span-12">
          <div className="bg-primary text-white rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-2xl" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                <span className="text-sm uppercase tracking-[0.2em] opacity-80 mb-2 block">{activePrayerInfo?.label}</span>
                <h2 className="serif text-6xl md:text-8xl font-light mb-4">{activePrayerInfo?.name}</h2>
                <div className="flex items-center justify-center md:justify-start gap-3 text-2xl opacity-90">
                  <Clock className="w-6 h-6" />
                  <span>{activePrayerInfo && formatTime12h(activePrayerInfo.time)}</span>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end">
                <span className="text-sm uppercase tracking-[0.2em] opacity-80 mb-4">Remaining Time</span>
                <div className="flex gap-4 md:gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl md:text-5xl font-light">
                      {timeRemaining ? timeRemaining.hours.toString().padStart(2, '0') : '00'}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">Hours</span>
                  </div>
                  <span className="text-4xl md:text-5xl font-light opacity-30">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl md:text-5xl font-light">
                      {timeRemaining ? timeRemaining.minutes.toString().padStart(2, '0') : '00'}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">Minutes</span>
                  </div>
                  <span className="text-4xl md:text-5xl font-light opacity-30">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl md:text-5xl font-light">
                      {timeRemaining ? timeRemaining.seconds.toString().padStart(2, '0') : '00'}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">Seconds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prayer List */}
        <section className="lg:col-span-8">
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="serif text-2xl text-primary mb-6">Daily Schedule</h3>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-gray-400">Fetching prayer times...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={() => fetchData(city.value)} className="text-primary underline">Try again</button>
              </div>
            ) : (
              <div className="space-y-4">
                {data && Object.entries(PRAYER_NAMES).map(([key, label]) => {
                  if (key === 'Sunrise') return null; // We use Sunrise as Fajr's end time
                  const isNext = activePrayerInfo?.name === key;
                  const range = getPrayerRange(key);
                  
                  return (
                    <div 
                      key={key}
                      className={cn(
                        "flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl transition-all gap-4",
                        isNext ? "bg-primary/5 border border-primary/10" : "hover:bg-secondary/50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                          isNext ? "bg-primary text-white" : "bg-secondary text-primary"
                        )}>
                          {getPrayerIcon(key)}
                        </div>
                        <div>
                          <p className={cn("text-lg font-semibold", isNext && "text-primary")}>{label}</p>
                          {isNext && <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Current</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 md:gap-12">
                        <div className="text-center md:text-right">
                          <span className="text-[10px] uppercase tracking-widest text-gray-400 block mb-1">Start</span>
                          <p className={cn("text-xl font-light", isNext ? "text-primary font-medium" : "text-gray-600")}>
                            {formatTime12h(range.start)}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-gray-100 hidden md:block" />
                        <div className="text-center md:text-right">
                          <span className="text-[10px] uppercase tracking-widest text-gray-400 block mb-1">End</span>
                          <p className={cn("text-xl font-light", isNext ? "text-primary font-medium" : "text-gray-600")}>
                            {formatTime12h(range.end)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Sidebar Info */}
        <section className="lg:col-span-4 flex flex-col gap-8">
          {/* Forbidden Times */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
            <h4 className="font-semibold text-sm mb-4 flex items-center gap-2 text-red-500">
              <Sun className="w-4 h-4" />
              Forbidden Times (Makruh)
            </h4>
            <div className="space-y-4">
              {getForbiddenTimes().map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 group relative">
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      <HelpCircle className="w-3 h-3 text-gray-300 cursor-help hover:text-red-400 transition-colors" />
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-56 p-3 bg-gray-900 text-white text-[10px] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in duration-200">
                        <p className="leading-relaxed">{item.explanation}</p>
                        <div className="absolute top-full left-4 border-8 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                    <span className="text-xs text-red-500 font-mono font-bold">
                      {formatTime12h(item.start)} - {formatTime12h(item.end)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">{item.description}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-6 italic leading-relaxed">
              * It is forbidden (Makruh) to perform any prayer during these specific times.
            </p>
          </div>

        </section>
      </main>

      {/* Footer */}
      <footer className="w-full mt-20 pt-12 border-t border-gray-200 text-center text-gray-400 text-sm pb-16">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8 text-xs uppercase tracking-widest opacity-70">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500">Location:</span>
            <span>{isUsingLocation ? (locationName || "Current Location") : city.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500">Method:</span>
            <span>Karachi (18°)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500">Timezone:</span>
            <span>{data?.meta.timezone || "UTC"}</span>
          </div>
        </div>
        <p>© {new Date().getFullYear()} Prayer Times. Data provided by Aladhan API.</p>
        <p className="mt-2">May your prayers be accepted.</p>
      </footer>
    </div>
  );
}
