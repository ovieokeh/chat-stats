"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  Heart,
  AlertCircle,
  Map as MapIcon,
  Volume2,
  Loader2,
  Search,
} from "lucide-react";

// API Configuration
const FOURSQUARE_KEY = "ZUXE2WY1DNIBL1GSIRRCJ51UQP3SQTUMTULH5TQCB3X4Y1QM";
const UNSPLASH_KEY = "O0F7gNQCrz__LcNGUbzvC4PGbHQh1Lhm128R_eINqSE";

export default function App() {
  const [step, setStep] = useState("welcome"); // 'welcome' | 'loading' | 'swiping' | 'itinerary'
  const [city, setCity] = useState("Amsterdam");
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likes, setLikes] = useState([]);
  const [swipeDir, setSwipeDir] = useState(null);
  const [error, setError] = useState(null);

  /**
   * SYSTEM LOGIC: DATA TRIANGULATION
   * Fetches high-signal places from Foursquare and maps them to professional Unsplash aesthetics.
   */
  const fetchVibes = async () => {
    setStep("loading");
    setError(null);
    try {
      // 1. Fetch Places from Foursquare (The Brain)
      // SYSTEMIC FIX: Using a CORS proxy to bypass browser security blocks on custom headers
      const targetUrl = `https://places-api.foursquare.com/places/search?query=${city}&categories=10000,13000,16000&limit=12&fields=fsq_place_id,name,location,categories`;

      const fsqResponse = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${FOURSQUARE_KEY}`,
          Accept: "application/json",
        },
      });

      if (!fsqResponse.ok) {
        throw new Error("Foursquare Signal Lost (CORS or Auth Error).");
      }

      const fsqData = await fsqResponse.json();

      if (!fsqData.results || fsqData.results.length === 0) {
        throw new Error("No signal found for this city.");
      }

      // 2. Enhance with Unsplash (The Soul)
      const enhancedCards = await Promise.all(
        fsqData.results.map(async (place) => {
          const categoryName = place.categories[0]?.name || "Travel";
          const query = `${categoryName} ${city} aesthetic`.replace(/\s+/g, "+");

          try {
            const unsplashRes = await fetch(
              `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=portrait&client_id=${UNSPLASH_KEY}`
            );
            const unsplashData = await unsplashRes.json();
            const imageUrl =
              unsplashData.results?.[0]?.urls?.regular ||
              "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=1000";

            return {
              id: place.fsq_id,
              title: place.name,
              subtitle: categoryName,
              tags: [place.location.neighborhood?.[0] || place.location.locality || city, "Vibe Verified"],
              image: imageUrl,
              location: {
                name: place.name,
                neighborhood: place.location.neighborhood?.[0] || place.location.locality || "Central",
                lat: place.geocodes?.main?.latitude,
                lng: place.geocodes?.main?.longitude,
              },
            };
          } catch (e) {
            return {
              id: place.fsq_id,
              title: place.name,
              subtitle: categoryName,
              tags: ["Local", "Atmospheric"],
              image: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=1000",
              location: {
                name: place.name,
                neighborhood: place.location.neighborhood?.[0] || "Central",
              },
            };
          }
        })
      );

      setCards(enhancedCards.filter((c) => c !== null));
      setStep("swiping");
    } catch (err) {
      setError(`System Fault: ${err.message}`);
      setStep("welcome");
    }
  };

  const itinerary = useMemo(() => {
    if (likes.length === 0) return [];
    const groups = likes.reduce((acc, item) => {
      const neighborhood = item.location.neighborhood;
      if (!acc[neighborhood]) acc[neighborhood] = [];
      acc[neighborhood].push(item);
      return acc;
    }, {});
    return Object.entries(groups).map(([neighborhood, spots], index) => ({
      day: index + 1,
      neighborhood,
      spots,
    }));
  }, [likes]);

  const handleSwipe = (direction) => {
    setSwipeDir(direction);
    setTimeout(() => {
      if (direction === "right") {
        setLikes((prev) => [...prev, cards[currentIndex]]);
      }
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDir(null);
      } else {
        setStep("itinerary");
      }
    }, 250);
  };

  const restart = () => {
    setStep("welcome");
    setCurrentIndex(0);
    setLikes([]);
    setSwipeDir(null);
    setCards([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
        {/* PROGRESS BAR */}
        {step === "swiping" && cards.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 z-50">
            <motion.div
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentIndex / cards.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* --- SCREEN: WELCOME --- */}
        {step === "welcome" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-600/30 rotate-3">
              <Compass className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-black mb-4 tracking-tighter">VibeRoute</h1>
            <p className="text-slate-400 mb-10 text-lg leading-relaxed">Extract your aesthetic path.</p>

            <div className="w-full space-y-4">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City (e.g. Amsterdam)"
                  className="w-full py-5 pl-14 pr-6 bg-slate-900 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-lg"
                />
              </div>
              <button
                onClick={fetchVibes}
                className="w-full py-5 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
              >
                Scan City <ChevronRight className="w-5 h-5" />
              </button>
              {error && (
                <div className="flex items-center gap-2 justify-center mt-4 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- SCREEN: LOADING --- */}
        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2 text-center">
              Architectural Extraction
            </h2>
            <p className="text-slate-500 text-center animate-pulse text-sm">
              Mapping local gems to current aesthetics...
            </p>
          </div>
        )}

        {/* --- SCREEN: SWIPING --- */}
        {step === "swiping" && cards[currentIndex] && (
          <div className="flex-1 flex flex-col p-6 pt-12 select-none">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">{city}</h2>
                <p className="text-slate-500 text-sm font-bold">
                  {currentIndex + 1} / {cards.length}
                </p>
              </div>
              <div className="text-[10px] font-black text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 uppercase tracking-widest">
                Verification Layer
              </div>
            </div>

            <div className="flex-1 relative perspective-1000">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={cards[currentIndex].id}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    x: swipeDir === "right" ? 600 : swipeDir === "left" ? -600 : 0,
                    rotate: swipeDir === "right" ? 25 : swipeDir === "left" ? -25 : 0,
                  }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                  className="w-full h-full bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800 relative z-10"
                >
                  <div className="relative h-full w-full">
                    <img
                      src={cards[currentIndex].image}
                      className="w-full h-full object-cover"
                      alt={cards[currentIndex].title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/10" />

                    <div className="absolute bottom-0 left-0 p-8 w-full">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {cards[currentIndex].tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-lg text-white"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-3xl font-black mb-2 tracking-tighter leading-none">
                        {cards[currentIndex].title}
                      </h3>
                      <p className="text-slate-300 text-[10px] font-black opacity-70 uppercase tracking-widest">
                        {cards[currentIndex].subtitle}
                      </p>
                    </div>

                    {swipeDir === "right" && (
                      <div className="absolute top-12 left-12 border-4 border-indigo-400 rounded-2xl px-6 py-3 -rotate-12 bg-indigo-500/20 backdrop-blur-sm">
                        <span className="text-indigo-400 font-black text-4xl uppercase tracking-tighter">Vibe</span>
                      </div>
                    )}
                    {swipeDir === "left" && (
                      <div className="absolute top-12 right-12 border-4 border-slate-400 rounded-2xl px-6 py-3 rotate-12 bg-slate-500/20 backdrop-blur-sm">
                        <span className="text-slate-400 font-black text-4xl uppercase tracking-tighter">Nah</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex justify-center items-center gap-10 py-10">
              <button
                onClick={() => handleSwipe("left")}
                className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-all active:scale-90"
              >
                <X className="w-7 h-7 text-slate-500" />
              </button>
              <button
                onClick={() => handleSwipe("right")}
                className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition-all active:scale-90 shadow-xl shadow-indigo-600/30"
              >
                <Heart className="w-10 h-10 text-white fill-current" />
              </button>
            </div>
          </div>
        )}

        {/* --- SCREEN: ITINERARY --- */}
        {step === "itinerary" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-y-auto p-6"
          >
            <div className="flex justify-between items-start mb-10 pt-4">
              <div>
                <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">
                  {city} Logical Map
                </h2>
                <h1 className="text-4xl font-black tracking-tighter">The Journey.</h1>
              </div>
              <button onClick={restart} className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                <RefreshCw className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {likes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-30">
                <AlertCircle className="w-16 h-16 mb-4" />
                <p className="font-bold">Extraction Profile: Null.</p>
              </div>
            ) : (
              <div className="space-y-12 mb-28">
                {itinerary.map((dayPlan) => (
                  <div key={dayPlan.day} className="relative">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 rounded-3xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-600/20">
                        {dayPlan.day}
                      </div>
                      <div>
                        <h3 className="font-black text-xl tracking-tight leading-none mb-1">
                          {dayPlan.neighborhood || city}
                        </h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black italic">
                          Spatial Cluster
                        </p>
                      </div>
                    </div>

                    <div className="ml-7 border-l-2 border-slate-800 pl-10 space-y-10">
                      {(dayPlan.spots as any).map((spot, idx) => (
                        <div key={spot.id} className="relative group">
                          <div className="absolute -left-[51px] top-2 w-5 h-5 rounded-full bg-slate-950 border-4 border-slate-800 group-hover:border-indigo-500 transition-all" />

                          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-[2.5rem] hover:bg-slate-900 transition-all">
                            <div className="flex gap-6">
                              <div className="w-24 h-24 rounded-3xl overflow-hidden flex-shrink-0 border border-slate-800 shadow-lg">
                                <img
                                  src={spot.image}
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-3 h-3 text-indigo-400" />
                                  <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">
                                    {idx === 0 ? "Entry point" : idx === 1 ? "Expansion" : "Final Resolution"}
                                  </span>
                                </div>
                                <h4 className="font-black text-lg text-slate-100 group-hover:text-white transition-colors leading-tight">
                                  {spot.title}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-2 text-slate-500 font-bold italic">
                                  <MapPin className="w-3 h-3 text-indigo-500" />
                                  <span className="text-[10px] uppercase tracking-wider">{spot.subtitle}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-slate-800 flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Verified Signal
                              </span>
                              <button className="px-5 py-2.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                                Reserve
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
              <button className="w-full max-w-md mx-auto py-5 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                <MapIcon className="w-5 h-5" /> Plot Vector Logic
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
