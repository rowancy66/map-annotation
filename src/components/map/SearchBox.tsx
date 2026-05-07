'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { Search, X, Loader2, Navigation, MapPin } from 'lucide-react';
import { TIANDITU_KEY } from '@/lib/constants';

interface SearchResult {
  name: string;
  address: string;
  lng: number;
  lat: number;
  score: number;
}

interface SearchBoxProps {
  map: L.Map | null;
}

export default function SearchBox({ map }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const clearMarker = useCallback(() => {
    if (searchMarkerRef.current && map) {
      map.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }
  }, [map]);

  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const level = map?.getZoom() || 12;
      let mapBound = '';
      if (map) {
        const b = map.getBounds();
        mapBound = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
      }
      const postStr = JSON.stringify({
        keyWord: keyword.trim(),
        queryType: '1',
        level,
        mapBound,
        start: 0,
        count: 10,
      });
      const url = `https://api.tianditu.gov.cn/v2/search?postStr=${encodeURIComponent(postStr)}&type=query&tk=${TIANDITU_KEY}`;

      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();

      if ((data.status?.infocode === 1000 || data.status === 'OK') && Array.isArray(data.pois)) {
        const parsed: SearchResult[] = data.pois.map((poi: Record<string, unknown>) => {
          // 天地图 API 返回的坐标在 lonlat 字段（如 "120.418,36.164"）
          let lng = Number(poi.lon || poi.lng || 0);
          let lat = Number(poi.lat || 0);
          if (!lng && !lat && poi.lonlat) {
            const parts = String(poi.lonlat).split(',');
            lng = Number(parts[0] || 0);
            lat = Number(parts[1] || 0);
          }
          return {
            name: String(poi.name || ''),
            address: String(poi.address || ''),
            lng,
            lat,
            score: Number(poi.score || 0),
          };
        });
        setResults(parsed);
        setShowResults(parsed.length > 0);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setShowResults(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [map]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const flyTo = useCallback((lng: number, lat: number) => {
    if (!map) return;
    clearMarker();

    map.flyTo([lat, lng], 16, { duration: 1 });

    const icon = L.divIcon({
      className: 'search-result-marker',
      html: `<div style="
        width: 32px; height: 32px;
        background: #3B82F6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        animation: searchPulse 1.5s ease-in-out infinite;
      ">
        <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    searchMarkerRef.current = marker;
  }, [map, clearMarker]);

  const handleSelect = (result: SearchResult) => {
    setQuery(result.name);
    setShowResults(false);
    flyTo(result.lng, result.lat);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    clearMarker();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  useEffect(() => {
    return () => {
      clearMarker();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [clearMarker]);

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end">
      <div className="relative w-72">
        {/* 搜索结果下拉 - 显示在搜索框上方 */}
        {showResults && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-xl border border-gray-200 max-h-72 overflow-y-auto">
            {results.length === 0 && !loading && (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                未找到结果
              </div>
            )}
            {results.map((result, idx) => (
              <button
                key={`${result.lng}-${result.lat}-${idx}`}
                onClick={() => handleSelect(result)}
                className={`w-full px-4 py-3 text-left flex items-start gap-3 transition ${
                  idx === selectedIndex
                    ? 'bg-blue-50 border-l-2 border-l-blue-600'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                } ${idx > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {result.name}
                  </div>
                  {result.address && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {result.address}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                  </div>
                </div>
                <Navigation className="w-3.5 h-3.5 text-gray-300 mt-1 shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="pl-3 pr-1 text-gray-400">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="搜索地址、路名..."
            className="flex-1 py-2.5 pr-2 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          {query && (
            <button
              onClick={handleClear}
              className="pr-2 pl-1 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes searchPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
