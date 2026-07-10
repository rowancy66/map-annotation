'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { Search, X, Loader2, Navigation, MapPin } from 'lucide-react';
import { HAS_TIANDITU_KEY, TIANDITU_KEY } from '@/lib/constants';

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
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setError('');
      return;
    }

    if (!HAS_TIANDITU_KEY) {
      setResults([]);
      setShowResults(true);
      setError('未配置天地图 key，当前无法搜索地址');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

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
        setShowResults(true);
        setSelectedIndex(-1);
        setError('');
      } else {
        setResults([]);
        setShowResults(true);
        setError('未找到结果');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setResults([]);
        setShowResults(true);
        setError('搜索失败，请稍后再试');
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
        background: #c8913a;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(80,60,40,0.3);
        display: flex; align-items: center; justify-content: center;
        animation: searchPulse 1.5s ease-in-out infinite;
      ">
        <svg viewBox="0 0 24 24" fill="white" width="14" height="14" aria-hidden="true">
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
    setError('');
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
    <div className="flex flex-col items-end">
      <div className="relative w-80">
        {showResults && (
          <div
            className="absolute top-full left-0 right-0 z-[1001] mt-1 max-h-72 overflow-y-auto border"
            style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)', boxShadow: '0 12px 32px rgba(80,60,40,0.08)' }}
          >
            {results.length === 0 && !loading && (
              <div className="px-4 py-3 text-center text-sm" style={{ color: error ? 'var(--danger)' : 'var(--faint)' }}>
                {error || '未找到结果'}
              </div>
            )}
            {results.map((result, idx) => (
              <button
                key={`${result.lng}-${result.lat}-${idx}`}
                onClick={() => handleSelect(result)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                  idx === selectedIndex
                    ? 'border-l-2 border-l-[#0b4f45]'
                    : 'border-l-2 border-l-transparent'
                }`}
                style={{
                  background: idx === selectedIndex ? 'rgba(10,75,63,0.05)' : 'var(--surface-strong)',
                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--primary)' }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {result.name}
                  </div>
                  {result.address && (
                    <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--muted)' }}>
                      {result.address}
                    </div>
                  )}
                  <div className="mt-0.5 text-[10px]" style={{ color: 'var(--faint)' }}>
                    {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                  </div>
                </div>
                <Navigation className="mt-1 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--faint)' }} />
              </button>
            ))}
          </div>
        )}

        <div
          className="flex items-center overflow-hidden border"
          style={{ background: 'rgba(250,247,242,0.96)', borderColor: 'var(--border)', boxShadow: '0 8px 20px rgba(80,60,40,0.06)' }}
        >
          <div className="pl-3 pr-1" style={{ color: 'var(--faint)' }}>
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
            onFocus={() => (results.length > 0 || error) && setShowResults(true)}
            placeholder={HAS_TIANDITU_KEY ? '搜索地址、路名…' : '未配置地图搜索'}
            disabled={!HAS_TIANDITU_KEY}
            className="flex-1 py-2 pr-2 text-sm outline-none disabled:cursor-not-allowed"
            style={{ color: 'var(--ink)' }}
          />
          {query && (
            <button
              onClick={handleClear}
              aria-label="清除搜索"
              className="pr-2 pl-1 transition"
              style={{ color: 'var(--faint)' }}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
