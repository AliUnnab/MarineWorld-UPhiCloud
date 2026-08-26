export interface CanonicalCityRegion {
  code: string;
  slug: string;
  name: string;
  leadCopy: string;
  heroImage: string;
  bgGradient: string;
  badgeBg: string;
  accentBorder: string;
  tagline: string;
  featuredHubs: string[];
}

export const CANONICAL_CITY_REGIONS: CanonicalCityRegion[] = [
  {
    code: "GLOBAL",
    slug: "global",
    name: "Global Edition",
    leadCopy: "Worldwide charter operations, commercial fleets, superyacht registries, and global maritime networks.",
    heroImage: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-slate-900 via-sky-950 to-slate-900",
    badgeBg: "bg-royal/20 text-slate-200 border-royal/30",
    accentBorder: "border-royal/30",
    tagline: "Worldwide Fleet Infrastructure & Commercial Registry",
    featuredHubs: ["Monaco", "Fort Lauderdale", "Rotterdam", "Singapore", "Dubai"],
  },
  {
    code: "MEDITERRANEAN",
    slug: "mediterranean",
    name: "Mediterranean Edition",
    leadCopy: "Mediterranean charter fleets, luxury motor yachts, Adriatic refit clusters, and Riviera port hubs.",
    heroImage: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-slate-900 via-royal/90 to-slate-900",
    badgeBg: "bg-royal/15 text-slate-200 border-royal/30",
    accentBorder: "border-royal/30",
    tagline: "The Yachting & Charter Heart of the Mediterranean Basin",
    featuredHubs: ["Monaco", "Cannes", "Palma de Mallorca", "Porto Cervo", "Athens"],
  },
  {
    code: "WESTERN_EUROPE",
    slug: "western-europe",
    name: "Western Europe Edition",
    leadCopy: "Europe's commercial spine — deepwater port terminals, naval engineering, and maritime finance corridors.",
    heroImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-slate-900 via-teal-950 to-slate-900",
    badgeBg: "bg-teal-500/20 text-teal-200 border-teal-400/30",
    accentBorder: "border-teal-500/40",
    tagline: "Commercial Shipping & Deepwater Engineering Gateway",
    featuredHubs: ["Rotterdam", "Hamburg", "London", "Antwerp", "Brest"],
  },
  {
    code: "NORTHERN_EUROPE",
    slug: "northern-europe",
    name: "Northern Europe Edition",
    leadCopy: "Nordic offshore technology, autonomous vessel research, subsea systems, and Arctic navigation clusters.",
    heroImage: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-slate-900 via-slate-900 to-slate-950",
    badgeBg: "bg-cyan-500/20 text-cyan-200 border-cyan-400/30",
    accentBorder: "border-cyan-500/40",
    tagline: "Offshore Energy & Autonomous Marine Technology Leaders",
    featuredHubs: ["Oslo", "Bergen", "Copenhagen", "Stockholm", "Helsinki"],
  },
  {
    code: "NORTH_AMERICA",
    slug: "north-america",
    name: "North America Edition",
    leadCopy: "Atlantic superyacht corridors, Gulf Coast workboat fleets, Great Lakes logistics, and Pacific innovation hubs.",
    heroImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-slate-900 via-blue-900 to-slate-950",
    badgeBg: "bg-royal/20 text-slate-200 border-royal/40/30",
    accentBorder: "border-royal/30",
    tagline: "Transatlantic Charter & Commercial Fleet Networks",
    featuredHubs: ["Fort Lauderdale", "Newport", "Seattle", "Houston", "San Diego"],
  },
  {
    code: "ASIA_PACIFIC",
    slug: "asia-pacific",
    name: "Asia Pacific Edition",
    leadCopy: "East Asian shipbuilding powerhouses, busy container trade lanes, and Australasian marine developments.",
    heroImage: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-slate-900 via-purple-950 to-slate-900",
    badgeBg: "bg-purple-500/20 text-purple-200 border-purple-400/30",
    accentBorder: "border-purple-500/40",
    tagline: "Global Container Terminals & High-Capacity Shipyards",
    featuredHubs: ["Singapore", "Hong Kong", "Tokyo", "Sydney", "Auckland"],
  },
  {
    code: "CARIBBEAN",
    slug: "caribbean",
    name: "Caribbean Edition",
    leadCopy: "Island charter seasons, superyacht marina stops, duty-free marine hubs, and tropical fleet management.",
    heroImage: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-teal-950 via-sky-900 to-slate-950",
    badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    accentBorder: "border-emerald-500/40",
    tagline: "Tropical Superyacht Haven & Seasonal Charter Capital",
    featuredHubs: ["St. Maarten", "Antigua", "St. Barths", "St. Thomas", "Nassau"],
  },
  {
    code: "MIDDLE_EAST",
    slug: "middle-east",
    name: "Middle East Edition",
    leadCopy: "Gulf mega-marinas, maritime logistics hubs, energy transport fleets, and Arabian Gulf offshore developments.",
    heroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=80",
    bgGradient: "from-amber-950 via-slate-900 to-amber-950",
    badgeBg: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    accentBorder: "border-amber-500/40",
    tagline: "Gulf Infrastructure & Mega-Yacht Waterfront Destinations",
    featuredHubs: ["Dubai", "Abu Dhabi", "Doha", "Jeddah", "Riyadh"],
  },
];
