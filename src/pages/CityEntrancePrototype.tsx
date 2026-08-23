import { useState } from "react";

export function CityEntrancePrototype() {
  const [activeEdition, setActiveEdition] = useState("Mediterranean");

  const editions = [
    "Global",
    "Mediterranean",
    "Western Europe",
    "Northern Europe",
    "North America",
    "Asia Pacific",
    "Caribbean",
    "Middle East",
  ];

  const districts = [
    {
      name: "MONACO",
      subtitle: "Superyacht District & Port Hercule Frontage",
      image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "ITALY",
      subtitle: "Ligurian Coast & Tyrrhenian Maritime Hub",
      image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "TÜRKIYE",
      subtitle: "Aegean & Riviera Maritime Boulevard",
      image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "FRANCE",
      subtitle: "Côte d'Azur Charter Promenade",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "GREECE",
      subtitle: "Cyclades & Ionian Island District",
      image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* ========================================================= */}
      {/* HEADER — CLEAN CITY SHELL ONLY                             */}
      {/* ========================================================= */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1280px] w-full mx-auto px-6 h-20 flex items-center justify-between box-border">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-md shadow-sky-500/50" />
            <a href="/city-entrance-prototype" className="text-xl font-black text-white tracking-tight hover:opacity-90 transition-opacity">
              MarineWorld.City
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#explore" className="hover:text-white transition-colors">
              Explore
            </a>
            <a href="#cities" className="hover:text-white transition-colors">
              Cities
            </a>
            <a href="#sectors" className="hover:text-white transition-colors">
              Sectors
            </a>
            <a href="#companies" className="hover:text-white transition-colors">
              Companies
            </a>
          </nav>

          <a
            href="/enter"
            className="px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20"
          >
            ENTER
          </a>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTAINER — STRICT 1280px MAX WIDTH                  */}
      {/* ========================================================= */}
      <main className="max-w-[1280px] w-full mx-auto px-6 box-border space-y-20 py-10 overflow-hidden">
        
        {/* ========================================================= */}
        {/* SECTION 1 — CITY ENTRANCE                                  */}
        {/* ========================================================= */}
        <section className="relative rounded-3xl overflow-hidden min-h-[520px] md:min-h-[580px] flex flex-col justify-end p-8 md:p-14 border border-white/10 shadow-2xl bg-slate-900">
          {/* Atmospheric City Canvas Image */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1800&q=80"
              alt="Charter City Environment"
              className="w-full h-full object-cover opacity-50 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
          </div>

          <div className="relative z-10 space-y-8 max-w-3xl">
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30 backdrop-blur-md">
                SECTOR CITY ENTRANCE
              </span>

              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tight leading-none drop-shadow-md">
                CHARTER.CITY
              </h1>

              <p className="text-xl md:text-2xl text-slate-200 font-medium leading-relaxed max-w-2xl drop-shadow">
                Yachting, Charter & Maritime Lifestyle
              </p>
            </div>

            {/* City Edition Selector */}
            <div className="pt-6 border-t border-white/15 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                CITY EDITION:
              </div>

              <div className="flex flex-wrap gap-2">
                {editions.map((ed) => {
                  const isSelected = activeEdition === ed;
                  return (
                    <button
                      key={ed}
                      onClick={() => setActiveEdition(ed)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                        isSelected
                          ? "bg-white text-slate-950 shadow-xl font-black scale-105"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-sky-500 animate-pulse" : "bg-white/40"
                        }`}
                      />
                      {ed.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2 — CITY LANDMARK                                  */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400">
              DOMINANT SPATIAL FRONTAGE
            </h2>
          </div>

          {/* Huge Spatial Commercial Frontage (Not a Card) */}
          <div className="relative rounded-3xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 text-white p-10 md:p-16 shadow-2xl overflow-hidden min-h-[380px] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4 max-w-2xl">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
                PRIMARY ANCHOR PROPERTY
              </span>

              <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                CITY LANDMARK AVAILABLE
              </h3>

              <p className="text-base md:text-lg text-slate-300 font-normal leading-relaxed">
                Establish primary commercial anchor frontage for your enterprise in the {activeEdition} edition of CHARTER.CITY.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <a
                href="/enter"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 text-sm font-black uppercase tracking-wider transition-all shadow-2xl hover:scale-105"
              >
                <span>RESERVE SPACE</span>
                <span className="text-sky-600 font-bold">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3 — CITY DISTRICTS                                 */}
        {/* ========================================================= */}
        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              GEOGRAPHIC DISTRICTS
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">
              CITY DISTRICTS
            </h2>
            <p className="text-sm text-slate-400">
              Physical regions and national maritime territories within the {activeEdition} edition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {districts.map((dist) => (
              <div
                key={dist.name}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-lg hover:border-white/20 transition-all duration-300 flex flex-col justify-end min-h-[320px] p-6"
              >
                <img
                  src={dist.image}
                  alt={dist.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                <div className="relative z-10 space-y-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                    {dist.name} DISTRICT
                  </span>

                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    {dist.subtitle}
                  </h3>

                  <a
                    href="/enter"
                    className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 group-hover:text-sky-300 uppercase tracking-wider pt-2"
                  >
                    <span>EXPLORE DISTRICT</span>
                    <span>→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4 — SHOWROOM STREET                                */}
        {/* ========================================================= */}
        <section className="space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              COMMERCIAL BOULEVARD
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">
              SHOWROOM STREET
            </h2>
            <p className="text-sm text-slate-400">
              Architectural frontage and empty digital commercial spaces ready for enterprise occupancy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className="relative rounded-2xl border border-dashed border-sky-500/30 bg-slate-900/60 p-8 min-h-[220px] flex flex-col justify-between hover:border-sky-400 transition-all group"
              >
                <div className="space-y-2">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                    SHOWROOM SPACE 0{num}
                  </span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    COMMERCIAL FRONTAGE AVAILABLE
                  </h3>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/10">
                  <span className="text-xs text-slate-400 font-medium">
                    Showroom Boulevard
                  </span>
                  <a
                    href="/enter"
                    className="text-xs font-bold text-white hover:text-sky-300 uppercase tracking-wider"
                  >
                    RESERVE SPACE →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
