import React, { useState, useRef, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import OriginDetail from './components/OriginDetail';
import ImportView from './components/ImportView';
import Analytics from './components/Analytics';
import { INITIAL_DATA, mapCityToZone, DEFAULT_SHEET_URL } from './constants';
import { parseWorkbook } from './utils';
import { AppView, OriginZone, AppNotification, User } from './types';
import { Bell, Search, X, Check, Box, RefreshCw, Clock, CalendarCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

// 30 Minutos em Segundos
const UPDATE_INTERVAL_SECONDS = 1800;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.OVERVIEW);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [data, setData] = useState<OriginZone[]>(INITIAL_DATA);
  
  // Tracking for duplicate notifications
  const [processedRouteIds, setProcessedRouteIds] = useState<Set<string>>(new Set());
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  
  // Timer States
  const [timeToNextUpdate, setTimeToNextUpdate] = useState(UPDATE_INTERVAL_SECONDS);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- FILTERED DATA BASED ON USER ---
  // If Global, see all. If Programmer, see only zones where they are the programmer.
  const filteredData = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'GLOBAL') return data;
    
    return data.filter(zone => zone.programmer.toUpperCase() === currentUser.name);
  }, [data, currentUser]);

  // --- AUTO SYNC LOGIC ---
  const fetchSheetData = async (isInitialLoad = false) => {
    setIsAutoSyncing(true);
    try {
        // Prioritize User Saved URL
        const savedUrl = localStorage.getItem('magnabosco_sheet_url_v2');
        const urlToFetch = savedUrl || DEFAULT_SHEET_URL;

        const response = await fetch(urlToFetch);
        if (!response.ok) throw new Error('Network error');
        
        const csvText = await response.text();
        const workbook = XLSX.read(csvText, { type: 'string' });
        const newZones = parseWorkbook(workbook);
        
        // Smart Notification Logic
        const newNotifications: AppNotification[] = [];
        const currentIds = new Set(processedRouteIds); 

        newZones.forEach(zone => {
            zone.routes.forEach(route => {
                if (!currentIds.has(route.id)) {
                    currentIds.add(route.id);
                    if (!isInitialLoad) {
                        newNotifications.push({
                            id: Math.random().toString(36).substr(2, 9),
                            message: `1 carga inclusa na zona de origem ${zone.name} no circuito ${route.id}`,
                            timestamp: new Date(),
                            read: false,
                            type: 'SUCCESS'
                        });
                    }
                }
            });
        });

        if (newNotifications.length > 0) {
            setNotifications(prev => [...newNotifications, ...prev].slice(0, 200));
        }

        setProcessedRouteIds(currentIds);
        setData(newZones);
        setLastUpdateTime(new Date());

    } catch (error) {
        console.error("Auto-sync failed:", error);
    } finally {
        setIsAutoSyncing(false);
    }
  };

  // Setup Polling on Login
  useEffect(() => {
    if (currentUser) {
        // Initial Fetch
        fetchSheetData(true);
        setTimeToNextUpdate(UPDATE_INTERVAL_SECONDS);

        const interval = setInterval(() => {
            setTimeToNextUpdate(prev => {
                if (prev <= 1) {
                    fetchSheetData(false);
                    return UPDATE_INTERVAL_SECONDS; // Reset to 30 mins
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to get selected zone object from FILTERED data
  const selectedZone = filteredData.find(z => z.id === selectedZoneId);

  // Handler for navigation
  const handleNavigate = (view: AppView, zoneId?: string) => {
    setCurrentView(view);
    if (zoneId) {
      setSelectedZoneId(zoneId);
    } else {
      setSelectedZoneId(null);
    }
  };

  // Handler for Manual Import (ImportView)
  const handleDataImport = (newZonesData: OriginZone[]) => {
    const newNotifications: AppNotification[] = [];
    const currentIds = new Set(processedRouteIds);

    newZonesData.forEach(zone => {
      zone.routes.forEach(route => {
        if (!currentIds.has(route.id)) {
            currentIds.add(route.id);
             newNotifications.push({
                id: Math.random().toString(36).substr(2, 9),
                message: `1 carga inclusa na zona de origem ${zone.name} no circuito ${route.id}`,
                timestamp: new Date(),
                read: false,
                type: 'SUCCESS'
             });
        }
      });
    });

    setNotifications(prev => [...newNotifications, ...prev].slice(0, 200));
    setProcessedRouteIds(currentIds);
    setData(newZonesData);
    setLastUpdateTime(new Date());
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-piano-text">
      <Sidebar 
        zones={filteredData}
        currentView={currentView}
        selectedZoneId={selectedZoneId}
        onNavigate={handleNavigate}
        onLogout={() => setCurrentUser(null)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-piano-900 relative">
        {/* Background gradient hint */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <header className="h-16 bg-black/50 border-b border-piano-800 flex items-center justify-between px-6 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center text-piano-muted bg-piano-800/50 rounded px-3 py-2 border border-piano-700 w-96 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-900 transition-all">
            <Search size={16} className="mr-3" />
            <input 
                type="text" 
                placeholder="Buscar contrato..." 
                className="bg-transparent border-none focus:outline-none text-sm text-white w-full placeholder-piano-600"
            />
          </div>

          <div className="flex items-center space-x-6">
            
            {/* Last Update Info */}
            <div className="hidden md:flex flex-col items-end mr-2">
                <div className="flex items-center gap-1.5 text-[10px] text-piano-muted uppercase tracking-wider font-bold">
                    <CalendarCheck size={12} className="text-piano-600"/>
                    Última Atualização
                </div>
                <div className="text-white font-mono text-xs">
                    {lastUpdateTime ? lastUpdateTime.toLocaleTimeString('pt-BR') : '--:--:--'}
                </div>
            </div>

            {/* Auto Sync Indicator & Timer */}
            <div className="flex items-center gap-4 bg-piano-800/50 py-1.5 px-3 rounded-full border border-piano-700/50 min-w-[160px] justify-center">
                {isAutoSyncing ? (
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={14} className="animate-spin" />
                        Atualizando...
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-piano-muted text-xs font-mono uppercase tracking-wider">
                        <Clock size={14} />
                        Próxima: <span className="text-cyan-500 font-bold">{formatTime(timeToNextUpdate)}</span>
                    </div>
                )}
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 transition-colors relative ${showNotifications ? 'text-cyan-400' : 'text-piano-muted hover:text-cyan-400'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-piano-900 border border-piano-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-piano-800 bg-black/50">
                    <h3 className="text-xs font-bold text-white">Notificações</h3>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllRead} 
                            className="text-[10px] text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                          >
                            <Check size={10} /> Ler tudo
                          </button>
                        )}
                        {notifications.length > 0 && (
                           <button 
                            onClick={clearNotifications} 
                            className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1"
                          >
                            <X size={10} /> Limpar
                          </button>
                        )}
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-piano-600">
                        <Bell size={20} className="mx-auto mb-2 opacity-50" />
                        <p className="text-[10px]">Nenhuma notificação nova</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-piano-800">
                        {notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`p-3 flex gap-3 hover:bg-piano-800/50 transition-colors ${!notif.read ? 'bg-cyan-900/5' : ''}`}
                          >
                            <div className="mt-1">
                                <div className="bg-cyan-900/30 p-1 rounded-full text-cyan-400 border border-cyan-900">
                                   <Box size={10} />
                                </div>
                            </div>
                            <div className="flex-1">
                              <p className={`text-[10px] ${!notif.read ? 'text-white font-medium' : 'text-piano-muted'}`}>
                                {notif.message}
                              </p>
                              <p className="text-[9px] text-piano-700 mt-1">
                                {notif.timestamp.toLocaleString('pt-BR')}
                              </p>
                            </div>
                            {!notif.read && (
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-8 px-3 rounded bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-400">
              {currentUser.name}
            </div>
          </div>
        </header>

        {/* Main Content Area - ALLOW SCROLLING (overflow-auto) */}
        <main className="flex-1 overflow-auto p-6 relative z-0">
          <div className="w-full max-w-[1920px] mx-auto flex flex-col pb-10">
            {currentView === AppView.OVERVIEW && (
              <Overview zones={filteredData} currentUser={currentUser} />
            )}

            {currentView === AppView.ANALYTICS && (
              <Analytics zones={filteredData} />
            )}

            {currentView === AppView.ZONE_DETAIL && selectedZone && (
              <OriginDetail zone={selectedZone} />
            )}

            {currentView === AppView.IMPORT && (
              <ImportView 
                currentZones={filteredData} 
                onProcessData={handleDataImport} 
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;