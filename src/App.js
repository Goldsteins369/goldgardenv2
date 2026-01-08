import React, { useState, useEffect, useRef } from 'react';
import { Timer, PackageOpen, MapPin, Flame, AlertTriangle, DollarSign, Clock, TrendingUp, Shield, Zap, Maximize, Sparkles, Skull, User } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 30;
const BASE_INVENTORY_SIZE = 4;
const BASE_MAX_OXYGEN = 100;
const BASE_OXYGEN_DRAIN_RATE = 0.15;
const BASE_EXTRACTION_TIME = 3000;

const PlantDatabase = {
  MINT: { name: 'Мята', emoji: '🌿', value: 15, rarity: 'common', size: [1, 1], hot: false, fragile: false, growTime: 180000 },
  FERN: { name: 'Папоротник', emoji: '🌿', value: 18, rarity: 'common', size: [1, 1], hot: false, fragile: false, growTime: 180000 },
  DANDELION: { name: 'Одуванчик', emoji: '🌼', value: 12, rarity: 'common', size: [1, 1], hot: false, fragile: false, growTime: 180000 },
  CHAMOMILE: { name: 'Ромашка', emoji: '🌼', value: 20, rarity: 'common', size: [1, 1], hot: false, fragile: false, growTime: 180000 },
  EDELWEISS: { name: 'Эдельвейс', emoji: '🏔️', value: 45, rarity: 'rare', size: [1, 1], hot: false, fragile: true, growTime: 240000 },
  DROSERA: { name: 'Росянка', emoji: '🥀', value: 60, rarity: 'rare', size: [1, 1], hot: true, fragile: false, growTime: 240000 },
  JASMINE: { name: 'Жасмин', emoji: '🌙', value: 55, rarity: 'rare', size: [1, 1], hot: false, fragile: false, growTime: 240000 },
  ALOE: { name: 'Алоэ', emoji: '🌵', value: 50, rarity: 'rare', size: [1, 1], hot: false, fragile: true, growTime: 240000 },
  CHILI: { name: 'Чили', emoji: '🌶️', value: 65, rarity: 'rare', size: [1, 1], hot: true, fragile: false, growTime: 240000 },
  LOTUS: { name: 'Лотос', emoji: '🪷', value: 120, rarity: 'epic', size: [2, 1], hot: false, fragile: true, growTime: 300000 },
  GINSENG: { name: 'Женьшень', emoji: '🧧', value: 150, rarity: 'epic', size: [2, 1], hot: false, fragile: false, growTime: 300000 },
  ORCHID: { name: 'Чёрная орхидея', emoji: '🖤', value: 140, rarity: 'epic', size: [2, 1], hot: false, fragile: true, growTime: 300000 },
  PROTEA: { name: 'Протея', emoji: '👑', value: 180, rarity: 'epic', size: [2, 2], hot: false, fragile: false, growTime: 300000 },
  TREE_LIFE: { name: 'Древо жизни', emoji: '🌳', value: 350, rarity: 'legendary', size: [2, 2], hot: false, fragile: true, growTime: 420000 },
  RAFFLESIA: { name: 'Раффлезия', emoji: '🌸', value: 500, rarity: 'legendary', size: [2, 2], hot: true, fragile: true, growTime: 420000 }
};

const Skins = {
  DEFAULT: { name: 'Стандарт', emoji: '🟢', price: 0 },
  FARMER: { name: 'Фермер', emoji: '👨‍🌾', price: 500 },
  ROBOT: { name: 'Робот-садовник', emoji: '🤖', price: 2000 },
  HAZMAT: { name: 'Биозащита', emoji: '☣️', price: 5000 },
  SPIRIT: { name: 'Лесной дух', emoji: '🧚', price: 15000 }
};

const Skills = {
  OXYGEN: { name: 'Запасы кислорода', icon: TrendingUp, maxLevel: 10, baseCost: 50, description: '+10% макс. кислорода' },
  SPEED: { name: 'Быстрые ручки', icon: Zap, maxLevel: 5, baseCost: 100, description: '-15% время сбора' },
  ARMOR: { name: 'Маска', icon: Shield, maxLevel: 1, baseCost: 200, description: '-15% урон от опасностей' },
  INVENTORY: { name: 'Расширение инвентаря', icon: Maximize, maxLevel: 3, baseCost: 150, description: '+1 слот в рюкзаке' }
};

const getRarityColor = (rarity) => {
  switch(rarity) {
    case 'common': return '#4ade80';
    case 'rare': return '#60a5fa';
    case 'epic': return '#a78bfa';
    case 'legendary': return '#fbbf24';
    default: return '#4ade80';
  }
};

const BioScavenger = () => {
  const [initialized, setInitialized] = useState(false);
  const [nickname, setNickname] = useState('');
  const [tempNickname, setTempNickname] = useState('');
  const [screen, setScreen] = useState('nickname');
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [oxygen, setOxygen] = useState(BASE_MAX_OXYGEN);
  const [plants, setPlants] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [extractionZone, setExtractionZone] = useState({ x: 18, y: 18 });
  const [extracting, setExtracting] = useState(null);
  const [extractProgress, setExtractProgress] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [dangerZones, setDangerZones] = useState([]);
  const [money, setMoney] = useState(0);
  const [stash, setStash] = useState([]);
  const [garden, setGarden] = useState([]);
  const [currentSkin, setCurrentSkin] = useState('DEFAULT');
  const [ownedSkins, setOwnedSkins] = useState(['DEFAULT']);
  const [skills, setSkills] = useState({ OXYGEN: 0, SPEED: 0, ARMOR: 0, INVENTORY: 0 });
  
  const extractTimerRef = useRef(null);
  const keysPressed = useRef({});

  useEffect(() => {
    const savedData = localStorage.getItem('bioScavengerSave');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.nickname) {
          setNickname(data.nickname);
          setMoney(data.money || 0);
          setStash(data.stash || []);
          setGarden(data.garden || []);
          setCurrentSkin(data.currentSkin || 'DEFAULT');
          setOwnedSkins(data.ownedSkins || ['DEFAULT']);
          setSkills(data.skills || { OXYGEN: 0, SPEED: 0, ARMOR: 0, INVENTORY: 0 });
          setScreen('menu');
          setInitialized(true);
        }
      } catch (e) {
        console.error('Failed to load save');
      }
    }
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const saveData = { nickname, money, stash, garden, currentSkin, ownedSkins, skills };
    localStorage.setItem('bioScavengerSave', JSON.stringify(saveData));
  }, [nickname, money, stash, garden, currentSkin, ownedSkins, skills, initialized]);

  useEffect(() => {
    const interval = setInterval(() => setGarden(prev => prev.map(g => ({ ...g }))), 1000);
    return () => clearInterval(interval);
  }, []);

  const saveNickname = () => {
    if (tempNickname.trim()) {
      setNickname(tempNickname.trim());
      setScreen('menu');
      setInitialized(true);
    }
  };

  const getMaxOxygen = () => BASE_MAX_OXYGEN * (1 + skills.OXYGEN * 0.1);
  const getExtractionTime = () => BASE_EXTRACTION_TIME * (1 - skills.SPEED * 0.15);
  const getInventorySize = () => BASE_INVENTORY_SIZE + skills.INVENTORY;
  const getDamageMultiplier = () => skills.ARMOR > 0 ? 0.85 : 1.0;

  const generateMap = () => {
    const newPlants = [];
    const newDangerZones = [];
    const newObstacles = [];
    
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      const y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      if ((x === 1 && y === 1) || (x === 18 && y === 18)) continue;
      newObstacles.push({ x, y, type: Math.random() > 0.5 ? '🌲' : '🪨' });
    }
    
    const plantKeys = Object.keys(PlantDatabase);
    for (let i = 0; i < 20; i++) {
      const rand = Math.random();
      let selectedKey;
      if (rand < 0.5) {
        selectedKey = plantKeys.filter(k => PlantDatabase[k].rarity === 'common')[Math.floor(Math.random() * 4)];
      } else if (rand < 0.8) {
        selectedKey = plantKeys.filter(k => PlantDatabase[k].rarity === 'rare')[Math.floor(Math.random() * 5)];
      } else if (rand < 0.95) {
        selectedKey = plantKeys.filter(k => PlantDatabase[k].rarity === 'epic')[Math.floor(Math.random() * 4)];
      } else {
        selectedKey = plantKeys.filter(k => PlantDatabase[k].rarity === 'legendary')[Math.floor(Math.random() * 2)];
      }
      
      const plantData = PlantDatabase[selectedKey];
      let x, y, attempts = 0;
      do {
        x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
        y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
        attempts++;
      } while (newObstacles.some(o => o.x === x && o.y === y) && attempts < 50);
      
      newPlants.push({ id: Math.random(), x, y, key: selectedKey, data: plantData });
    }
    
    for (let i = 0; i < 10; i++) {
      let x, y, attempts = 0;
      do {
        x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        attempts++;
      } while (newObstacles.some(o => o.x === x && o.y === y) && attempts < 50);
      newDangerZones.push({ x, y });
    }
    
    setPlants(newPlants);
    setDangerZones(newDangerZones);
    setObstacles(newObstacles);
  };

  const startRaid = () => {
    setScreen('raid');
    setPlayerPos({ x: 1, y: 1 });
    setOxygen(getMaxOxygen());
    setInventory([]);
    setGameOver(false);
    setExtracted(false);
    setTotalValue(0);
    setExtracting(null);
    setExtractProgress(0);
    generateMap();
  };

  useEffect(() => {
    if (screen !== 'raid' || gameOver || extracted) return;
    const interval = setInterval(() => {
      setOxygen(prev => {
        const drain = extracting ? BASE_OXYGEN_DRAIN_RATE * 2 : BASE_OXYGEN_DRAIN_RATE;
        const hotDrain = inventory.filter(item => item.data.hot).length * 0.3;
        const newOxygen = prev - drain - hotDrain;
        if (newOxygen <= 0) {
          setGameOver(true);
          return 0;
        }
        return newOxygen;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [screen, gameOver, extracted, extracting, inventory]);

  useEffect(() => {
    if (screen !== 'raid') return;
    
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      if (key === 'e' || key === 'у') {
        const nearbyPlant = plants.find(p => Math.abs(p.x - playerPos.x) <= 1 && Math.abs(p.y - playerPos.y) <= 1);
        if (nearbyPlant && !extracting && !gameOver && !extracted) {
          startExtraction(nearbyPlant);
        }
      }
    };
    
    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const moveInterval = setInterval(() => {
      if (gameOver || extracted || extracting) return;
      setPlayerPos(prev => {
        let newX = prev.x;
        let newY = prev.y;
        if (keysPressed.current['w'] || keysPressed.current['ц']) newY = Math.max(0, prev.y - 1);
        if (keysPressed.current['s'] || keysPressed.current['ы']) newY = Math.min(GRID_SIZE - 1, prev.y + 1);
        if (keysPressed.current['a'] || keysPressed.current['ф']) newX = Math.max(0, prev.x - 1);
        if (keysPressed.current['d'] || keysPressed.current['в']) newX = Math.min(GRID_SIZE - 1, prev.x + 1);
        
        const hitObstacle = obstacles.some(o => o.x === newX && o.y === newY);
        if (hitObstacle) return prev;
        
        const inDanger = dangerZones.some(d => d.x === newX && d.y === newY);
        if (inDanger) {
          setOxygen(o => Math.max(0, o - (5 * getDamageMultiplier())));
          const fragileItems = inventory.filter(item => item.data.fragile);
          if (fragileItems.length > 0) {
            setInventory(inv => inv.filter(item => !item.data.fragile));
          }
        }
        return { x: newX, y: newY };
      });
    }, 150);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(moveInterval);
    };
  }, [screen, gameOver, extracted, extracting, dangerZones, inventory, obstacles, plants, playerPos]);

  const startExtraction = (plant) => {
    if (extracting || gameOver || extracted) return;
    setExtracting(plant);
    setExtractProgress(0);
    const extractTime = getExtractionTime();
    const startTime = Date.now();
    extractTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / extractTime) * 100;
      setExtractProgress(progress);
      if (progress >= 100) {
        clearInterval(extractTimerRef.current);
        addToInventory(plant);
        setPlants(p => p.filter(pl => pl.id !== plant.id));
        setExtracting(null);
        setExtractProgress(0);
      }
    }, 50);
  };

  const addToInventory = (plant) => {
    const invSize = getInventorySize();
    if (inventory.length < invSize * invSize) {
      setInventory(prev => [...prev, { ...plant, inventoryId: Math.random() }]);
    }
  };

  const tryExtract = () => {
    if (playerPos.x === extractionZone.x && playerPos.y === extractionZone.y) {
      const value = inventory.reduce((sum, item) => sum + item.data.value, 0);
      setTotalValue(value);
      setStash(prev => [...prev, ...inventory]);
      setExtracted(true);
    }
  };

  useEffect(() => {
    if (playerPos.x === extractionZone.x && playerPos.y === extractionZone.y && !extracted && !gameOver && screen === 'raid') {
      tryExtract();
    }
  }, [playerPos, extracted, gameOver, screen, extractionZone]);

  const sellAllItems = () => {
    const totalValue = stash.reduce((sum, item) => sum + item.data.value, 0);
    setMoney(prev => prev + totalValue);
    setStash([]);
  };

  const plantItem = (item) => {
    if (garden.length >= 6) return;
    setStash(prev => prev.filter(i => i.inventoryId !== item.inventoryId));
    setGarden(prev => [...prev, { ...item, plantedAt: Date.now() }]);
  };

  const harvestPlant = (gardenItem) => {
    const value = gardenItem.data.value * 3;
    setMoney(prev => prev + value);
    setGarden(prev => prev.filter(g => g.inventoryId !== gardenItem.inventoryId));
  };

  const buySkill = (skillKey) => {
    const skill = Skills[skillKey];
    const currentLevel = skills[skillKey];
    if (currentLevel >= skill.maxLevel) return;
    const cost = skill.baseCost * (currentLevel + 1);
    if (money >= cost) {
      setMoney(prev => prev - cost);
      setSkills(prev => ({ ...prev, [skillKey]: currentLevel + 1 }));
    }
  };

  const buySkin = (skinKey) => {
    const skin = Skins[skinKey];
    if (ownedSkins.includes(skinKey)) {
      setCurrentSkin(skinKey);
    } else if (money >= skin.price) {
      setMoney(prev => prev - skin.price);
      setOwnedSkins(prev => [...prev, skinKey]);
      setCurrentSkin(skinKey);
    }
  };

  const getGrowthProgress = (plantedAt, growTime) => {
    const elapsed = Date.now() - plantedAt;
    return Math.min((elapsed / growTime) * 100, 100);
  };

  const isGrown = (plantedAt, growTime) => Date.now() - plantedAt >= growTime;

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (screen === 'nickname') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 text-green-400 flex flex-col items-center justify-center font-mono p-4">
        <div className="bg-gray-800/80 backdrop-blur border-2 border-green-600 p-8 rounded-lg shadow-2xl max-w-md w-full">
          <h1 className="text-3xl mb-2 text-center text-green-500 font-bold">САДИК ГОЛЬДШТЕЙНА</h1>
          <p className="text-center text-gray-400 mb-8">v1.1</p>
          <div className="mb-6">
            <label className="block text-sm mb-2">Введите ваш позывной:</label>
            <input
              type="text"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && saveNickname()}
              maxLength={20}
              className="w-full bg-gray-900 border-2 border-green-600 text-green-400 px-4 py-3 text-lg focus:outline-none focus:border-green-400"
              placeholder="Введите имя..."
              autoFocus
            />
          </div>
          <button
            onClick={saveNickname}
            disabled={!tempNickname.trim()}
            className="w-full px-6 py-3 bg-green-900 border-2 border-green-500 text-green-400 text-xl hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            НАЧАТЬ
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'menu') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 text-green-400 flex flex-col items-center justify-center font-mono">
        <div className="text-6xl mb-4">{Skins[currentSkin].emoji}</div>
        <h1 className="text-5xl mb-2 tracking-widest text-green-500 font-bold" style={{textShadow: '0 0 20px #22c55e'}}>САДИК ГОЛЬДШТЕЙНА</h1>
        <p className="text-xl mb-2 text-green-600">v1.1</p>
        <p className="text-lg mb-8 text-yellow-400">Привет, {nickname}!</p>
        <div className="flex flex-col gap-4 mb-8">
          <button onClick={startRaid} className="px-10 py-4 bg-green-900 border-2 border-green-500 text-green-400 text-xl hover:bg-green-800 transition-all hover:shadow-lg hover:shadow-green-500/50 hover:scale-105">
            🌿 ВЫЛАЗКА
          </button>
          <button onClick={() => setScreen('garden')} className="px-10 py-4 bg-green-900 border-2 border-green-500 text-green-400 text-xl hover:bg-green-800 transition-all hover:scale-105">
            🏡 САДИК
          </button>
          <button onClick={() => setScreen('greenhouse')} className="px-10 py-4 bg-green-900 border-2 border-green-500 text-green-400 text-xl hover:bg-green-800 transition-all hover:scale-105">
            🏗️ ТЕПЛИЦА
          </button>
          <button onClick={() => setScreen('customization')} className="px-10 py-4 bg-purple-900 border-2 border-purple-500 text-purple-400 text-xl hover:bg-purple-800 transition-all hover:scale-105">
            🎨 КАСТОМИЗАЦИЯ
          </button>
        </div>
        <div className="text-center">
          <div className="text-3xl text-yellow-400 mb-2 flex items-center gap-2 justify-center">
            <DollarSign size={28} />
            {money} ₽
          </div>
          <p className="text-gray-500 text-sm">WASD - движение | E - сбор</p>
        </div>
      </div>
    );
  }

  if (screen === 'customization') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-purple-400 p-6 font-mono overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">🎨 КАСТОМИЗАЦИЯ</h1>
            <div className="flex gap-4 items-center">
              <div className="text-2xl text-yellow-400 flex items-center gap-2">
                <DollarSign size={24} />
                {money} ₽
              </div>
              <button onClick={() => setScreen('menu')} className="px-4 py-2 bg-gray-800 border border-gray-600 hover:bg-gray-700">В МЕНЮ</button>
            </div>
          </div>
          <div className="bg-gray-800/80 backdrop-blur border border-purple-600 p-6 mb-6 rounded-lg">
            <h2 className="text-xl mb-4 flex items-center gap-2">
              <User size={24} />
              Текущий облик: <span className="text-yellow-400">{Skins[currentSkin].name}</span>
            </h2>
            <div className="text-6xl text-center">{Skins[currentSkin].emoji}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(Skins).map(([key, skin]) => {
              const owned = ownedSkins.includes(key);
              const active = currentSkin === key;
              return (
                <div key={key} className={`bg-gray-800/80 backdrop-blur border-2 p-6 rounded-lg transition-all ${active ? 'border-yellow-500 shadow-lg shadow-yellow-500/50' : 'border-gray-600 hover:border-purple-500'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-5xl mb-2">{skin.emoji}</div>
                      <div className="text-xl font-bold text-purple-400">{skin.name}</div>
                      <div className="text-sm text-gray-400">{skin.price === 0 ? 'Бесплатно' : `${skin.price} ₽`}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => buySkin(key)}
                    disabled={active}
                    className={`w-full py-2 border-2 transition-all ${active ? 'bg-yellow-900/50 border-yellow-600 text-yellow-400 cursor-default' : owned ? 'bg-purple-900 border-purple-500 text-purple-400 hover:bg-purple-800' : money >= skin.price ? 'bg-green-900 border-green-500 text-green-400 hover:bg-green-800' : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'}`}
                  >
                    {active ? 'АКТИВЕН' : owned ? 'ВЫБРАТЬ' : money >= skin.price ? 'КУПИТЬ' : 'НЕДОСТАТОЧНО'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'garden') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 text-green-400 p-6 font-mono overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">🏡 САДИК</h1>
            <div className="flex gap-4 items-center">
              <div className="text-2xl text-yellow-400 flex items-center gap-2">
                <DollarSign size={24} />
                {money} ₽
              </div>
              <button onClick={() => setScreen('menu')} className="px-4 py-2 bg-gray-800 border border-gray-600 hover:bg-gray-700">В МЕНЮ</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-800/80 backdrop-blur border border-green-600 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">СКЛАД ({stash.length})</h2>
                {stash.length > 0 && (
                  <button onClick={sellAllItems} className="px-4 py-2 bg-red-900 border border-red-500 text-red-400 hover:bg-red-800 transition-all">
                    ПРОДАТЬ ВСЁ ({stash.reduce((sum, item) => sum + item.data.value, 0)} ₽)
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stash.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Склад пуст</p>
                ) : (
                  stash.map(item => (
                    <div key={item.inventoryId} className="bg-gray-900 border border-gray-600 p-3 flex justify-between items-center rounded hover:border-green-500 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{item.data.emoji}</div>
                        <div>
                          <div style={{color: getRarityColor(item.data.rarity)}}>{item.data.name}</div>
                          <div className="text-xs text-gray-400">{item.data.value} ₽</div>
                        </div>
                      </div>
                      <button
                        onClick={() => plantItem(item)}
                        disabled={garden.length >= 6}
                        className="px-3 py-1 bg-green-900 border border-green-500 text-green-400 hover:bg-green-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        ПОСАДИТЬ
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-gray-800/80 backdrop-blur border border-green-600 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">ГРЯДКИ ({garden.length}/6)</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {garden.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Нет растений</p>
                ) : (
                  garden.map(item => {
                    const progress = getGrowthProgress(item.plantedAt, item.data.growTime);
                    const grown = isGrown(item.plantedAt, item.data.growTime);
                    const timeLeft = item.data.growTime - (Date.now() - item.plantedAt);
                    return (
                      <div key={item.inventoryId} className="bg-gray-900 border border-gray-600 p-3 rounded hover:border-green-500 transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{item.data.emoji}</div>
                            <div>
                              <div style={{color: getRarityColor(item.data.rarity)}}>{item.data.name}</div>
                              <div className="text-xs text-yellow-400">+{item.data.value * 3} ₽</div>
                            </div>
                          </div>
                          {grown ? (
                            <button onClick={() => harvestPlant(item)} className="px-3 py-1 bg-yellow-900 border border-yellow-500 text-yellow-400 hover:bg-yellow-800 text-sm animate-pulse">
                              СОБРАТЬ
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock size={14} />
                              {formatTime(timeLeft)}
                            </div>
                          )}
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded">
                          <div className="h-full bg-green-500 rounded transition-all" style={{width: `${progress}%`}} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'greenhouse') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 text-green-400 p-6 font-mono overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">🏗️ ТЕПЛИЦА</h1>
            <div className="flex gap-4 items-center">
              <div className="text-2xl text-yellow-400 flex items-center gap-2">
                <DollarSign size={24} />
                {money} ₽
              </div>
              <button onClick={() => setScreen('menu')} className="px-4 py-2 bg-gray-800 border border-gray-600 hover:bg-gray-700">В МЕНЮ</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(Skills).map(([key, skill]) => {
              const Icon = skill.icon;
              const currentLevel = skills[key];
              const cost = skill.baseCost * (currentLevel + 1);
              const maxed = currentLevel >= skill.maxLevel;
              return (
                <div key={key} className="bg-gray-800/80 backdrop-blur border-2 border-gray-700 p-4 rounded-lg flex justify-between items-center hover:border-green-500 transition-all">
                  <div className="flex items-center gap-4">
                    <Icon size={32} className="text-green-400" />
                    <div>
                      <div className="text-xl font-bold">{skill.name}</div>
                      <div className="text-sm text-gray-400">{skill.description}</div>
                      <div className="text-sm text-yellow-400 mt-1">Уровень: {currentLevel}/{skill.maxLevel}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => buySkill(key)}
                    disabled={maxed || money < cost}
                    className="px-6 py-3 bg-green-900 border border-green-500 text-green-400 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {maxed ? 'МАКС' : `${cost} ₽`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 text-red-400 flex flex-col items-center justify-center font-mono">
        <Skull size={80} className="mb-6 animate-pulse" />
        <h1 className="text-4xl mb-4">КИСЛОРОД ЗАКОНЧИЛСЯ</h1>
        <p className="text-xl mb-8 text-gray-400">Вся добыча потеряна</p>
        <button onClick={() => setScreen('menu')} className="px-8 py-3 bg-red-900 border-2 border-red-500 text-red-400 hover:bg-red-800">В МЕНЮ</button>
      </div>
    );
  }

  if (extracted) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 text-green-400 flex flex-col items-center justify-center font-mono">
        <Sparkles size={80} className="mb-6 text-yellow-400" />
        <h1 className="text-4xl mb-4">УСПЕШНАЯ ЭКСТРАКЦИЯ</h1>
        <p className="text-2xl mb-4 text-yellow-400">Добыча: {totalValue} ₽</p>
        <div className="mb-8 max-h-64 overflow-y-auto">
          {inventory.map(item => (
            <div key={item.inventoryId} className="text-lg flex items-center gap-2" style={{color: getRarityColor(item.data.rarity)}}>
              <span className="text-2xl">{item.data.emoji}</span>
              {item.data.name} (+{item.data.value} ₽)
            </div>
          ))}
        </div>
        <button onClick={() => setScreen('menu')} className="px-8 py-3 bg-green-900 border-2 border-green-500 text-green-400 hover:bg-green-800">В МЕНЮ</button>
      </div>
    );
  }

  const nearbyPlant = plants.find(p => Math.abs(p.x - playerPos.x) <= 1 && Math.abs(p.y - playerPos.y) <= 1);
  const invSize = getInventorySize();

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 text-green-400 p-4 font-mono overflow-hidden">
      <div className="flex gap-4 h-full">
        <div className="flex-1 flex flex-col">
          <div className="mb-2 flex items-center justify-between bg-gray-800/80 backdrop-blur p-3 border border-gray-700 rounded">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Timer size={20} />
                <div className="w-48 h-6 bg-gray-700 border border-gray-600 relative rounded">
                  <div className="h-full transition-all rounded" style={{width: `${(oxygen / getMaxOxygen()) * 100}%`, backgroundColor: oxygen > getMaxOxygen() * 0.5 ? '#22c55e' : oxygen > getMaxOxygen() * 0.25 ? '#fb923c' : '#ef4444'}} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{Math.floor(oxygen)}/{Math.floor(getMaxOxygen())}</span>
                </div>
              </div>
              <div className="text-sm text-gray-400">🔥 Горячих: {inventory.filter(i => i.data.hot).length}</div>
            </div>
          </div>
          <div className="relative bg-gray-950 border-2 border-green-900 rounded-lg overflow-hidden" style={{width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE}}>
            {dangerZones.map((zone, i) => (
              <div key={i} className="absolute bg-red-950 opacity-40" style={{left: zone.x * CELL_SIZE, top: zone.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE}} />
            ))}
            {obstacles.map((obs, i) => (
              <div key={i} className="absolute flex items-center justify-center text-xl" style={{left: obs.x * CELL_SIZE, top: obs.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE}}>{obs.type}</div>
            ))}
            <div className="absolute bg-green-950 border-2 border-green-500 flex items-center justify-center animate-pulse rounded" style={{left: extractionZone.x * CELL_SIZE, top: extractionZone.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE}}>
              <MapPin size={20} className="text-green-400" />
            </div>
            {plants.map(plant => (
              <div key={plant.id} className="absolute flex items-center justify-center text-xl" style={{left: plant.x * CELL_SIZE, top: plant.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getRarityColor(plant.data.rarity) + '33', border: `2px solid ${getRarityColor(plant.data.rarity)}`, borderRadius: '4px'}}>
                {plant.data.emoji}
              </div>
            ))}
            <div className="absolute flex items-center justify-center text-2xl transition-all" style={{left: playerPos.x * CELL_SIZE, top: playerPos.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE}}>
              {Skins[currentSkin].emoji}
            </div>
            {extracting && (
              <div className="absolute top-2 left-2 right-2 bg-gray-800/90 backdrop-blur border border-green-500 p-2 rounded">
                <div className="text-xs mb-1 flex items-center gap-2">
                  <span className="text-xl">{extracting.data.emoji}</span>
                  Извлечение: {extracting.data.name}
                </div>
                <div className="w-full h-4 bg-gray-700 relative rounded">
                  <div className="h-full bg-green-500 transition-all rounded" style={{width: `${extractProgress}%`}} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-gray-800/80 backdrop-blur border border-gray-700 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <PackageOpen size={20} />
              <span className="font-bold">РЮКЗАК {inventory.length}/{invSize * invSize}</span>
            </div>
            <div className="grid gap-1 bg-gray-950 p-2 border border-gray-600 rounded" style={{gridTemplateColumns: `repeat(${invSize}, 1fr)`, gridTemplateRows: `repeat(${invSize}, 1fr)`}}>
              {Array.from({length: invSize * invSize}).map((_, i) => {
                const item = inventory[i];
                return (
                  <div key={i} className="aspect-square border border-gray-700 flex items-center justify-center text-xl relative rounded" style={{backgroundColor: item ? getRarityColor(item.data.rarity) + '33' : 'transparent'}}>
                    {item && (
                      <>
                        {item.data.emoji}
                        {item.data.hot && <Flame size={10} className="absolute top-0 right-0 text-orange-500" />}
                        {item.data.fragile && <AlertTriangle size={10} className="absolute bottom-0 right-0 text-yellow-500" />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-gray-400">Стоимость: {inventory.reduce((sum, item) => sum + item.data.value, 0)} ₽</div>
          </div>
          {nearbyPlant && (
            <div className="bg-gray-800/80 backdrop-blur border-2 border-green-600 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{nearbyPlant.data.emoji}</span>
                <div>
                  <div className="text-lg font-bold" style={{color: getRarityColor(nearbyPlant.data.rarity)}}>{nearbyPlant.data.name}</div>
                  <div className="text-xs text-gray-400">Ценность: {nearbyPlant.data.value} ₽</div>
                </div>
              </div>
              <div className="flex gap-2 mb-3 text-xs flex-wrap">
                <span className="px-2 py-1 bg-gray-700 rounded" style={{color: getRarityColor(nearbyPlant.data.rarity)}}>{nearbyPlant.data.rarity.toUpperCase()}</span>
                {nearbyPlant.data.hot && (
                  <span className="flex items-center gap-1 text-orange-400 px-2 py-1 bg-orange-950 rounded">
                    <Flame size={12} /> Горячий
                  </span>
                )}
                {nearbyPlant.data.fragile && (
                  <span className="flex items-center gap-1 text-yellow-400 px-2 py-1 bg-yellow-950 rounded">
                    <AlertTriangle size={12} /> Хрупкий
                  </span>
                )}
              </div>
              <button
                onClick={() => startExtraction(nearbyPlant)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={extracting !== null}
                className="w-full py-2 bg-green-900 border border-green-500 text-green-400 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded"
              >
                {extracting ? 'ИЗВЛЕЧЕНИЕ...' : 'СОБРАТЬ [E]'}
              </button>
            </div>
          )}
          <div className="bg-gray-800/80 backdrop-blur border border-gray-700 p-4 text-xs rounded-lg">
            <div className="mb-2 font-bold text-yellow-400">ЛЕГЕНДА:</div>
            <div className="space-y-1 text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-xl">{Skins[currentSkin].emoji}</span>
                Вы
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-green-400" />
                Точка экстракции
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🌲🪨</span>
                Препятствия
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-950 border border-red-800 rounded" />
                Шипы (урон)
              </div>
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-orange-400" />
                Горячий (−O₂)
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                Хрупкий
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BioScavenger;