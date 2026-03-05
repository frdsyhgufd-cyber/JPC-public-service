import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Physician, 
  Evaluator, 
  EvaluationItem, 
  SystemConfig, 
  Submission, 
  SpecialBonus, 
  strokeSort 
} from './types';
import { 
  Settings, 
  UserPlus, 
  Trash2, 
  ChevronLeft, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Plus, 
  FileText, 
  LogOut, 
  Lock,
  Search,
  ChevronRight,
  UserCheck,
  UserX,
  GripVertical,
  Edit2,
  X,
  ListChecks
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ROC Year Helper
const toROC = (date: Date) => date.getFullYear() - 1911;

const westernToROCDate = (westernDate: string) => {
  if (!westernDate) return '';
  const parts = westernDate.split('-');
  if (parts.length !== 3) return westernDate;
  const [y, m, d] = parts;
  const rocYear = parseInt(y) - 1911;
  return `${rocYear}-${m}-${d}`;
};

const rocToWesternDate = (rocDate: string) => {
  if (!rocDate) return '';
  const parts = rocDate.split('-');
  if (parts.length !== 3) return rocDate;
  const [y, m, d] = parts;
  const westernYear = parseInt(y) + 1911;
  return `${westernYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-200"
          >
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={24} />
              <h3 className="text-xl font-bold">{title}</h3>
            </div>
            <p className="text-stone-600 mb-8 leading-relaxed">{message}</p>
            <div className="flex gap-3">
              <button 
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded-xl bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
              >
                確認刪除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [view, setView] = useState<'home' | 'evaluator' | 'admin-login' | 'admin'>('home');
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [specialBonuses, setSpecialBonuses] = useState<SpecialBonus[]>([]);
  const [selectedEvaluator, setSelectedEvaluator] = useState<Evaluator | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Initialization
  useEffect(() => {
    let loaded = {
      config: false,
      physicians: false,
      evaluators: false,
      items: false
    };

    const checkLoaded = () => {
      if (loaded.config && loaded.physicians && loaded.evaluators && loaded.items) {
        setLoading(false);
      }
    };

    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as SystemConfig);
      } else {
        const initialConfig: SystemConfig = {
          currentYear: toROC(new Date()),
          currentMonth: new Date().getMonth() + 1,
          deadlineStart: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
          deadlineEnd: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-31`,
          adminPassword: '0423'
        };
        setDoc(doc(db, 'config', 'main'), initialConfig);
      }
      loaded.config = true;
      checkLoaded();
    }, (err) => {
      console.error("Config error:", err);
      setLoadingError(prev => prev ? prev + ", Config" : "Firebase 連線錯誤: Config");
      loaded.config = true;
      checkLoaded();
    });

    const unsubPhysicians = onSnapshot(collection(db, 'physicians'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Physician));
      setPhysicians(list.sort((a, b) => strokeSort(a.name, b.name)));
      loaded.physicians = true;
      checkLoaded();
    }, (err) => {
      console.error("Physicians error:", err);
      setLoadingError(prev => prev ? prev + ", Physicians" : "Firebase 連線錯誤: Physicians");
      loaded.physicians = true;
      checkLoaded();
    });

    const unsubEvaluators = onSnapshot(collection(db, 'evaluators'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluator));
      setEvaluators(list.sort((a, b) => strokeSort(a.name, b.name)));
      loaded.evaluators = true;
      checkLoaded();
    }, (err) => {
      console.error("Evaluators error:", err);
      setLoadingError(prev => prev ? prev + ", Evaluators" : "Firebase 連線錯誤: Evaluators");
      loaded.evaluators = true;
      checkLoaded();
    });

    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as EvaluationItem));
      setItems(list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      loaded.items = true;
      checkLoaded();
    }, (err) => {
      console.error("Items error:", err);
      setLoadingError(prev => prev ? prev + ", Items" : "Firebase 連線錯誤: Items");
      loaded.items = true;
      checkLoaded();
    });

    return () => {
      unsubConfig();
      unsubPhysicians();
      unsubEvaluators();
      unsubItems();
    };
  }, []);

  // Fetch submissions and bonuses for current month
  useEffect(() => {
    if (!config) return;
    const qSub = query(collection(db, 'submissions'), 
      where('year', '==', config.currentYear), 
      where('month', '==', config.currentMonth));
    const unsubSub = onSnapshot(qSub, (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
    });

    const qBonus = query(collection(db, 'specialBonuses'), 
      where('year', '==', config.currentYear), 
      where('month', '==', config.currentMonth));
    const unsubBonus = onSnapshot(qBonus, (snap) => {
      setSpecialBonuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as SpecialBonus)));
    });

    return () => {
      unsubSub();
      unsubBonus();
    };
  }, [config?.currentYear, config?.currentMonth]);

  const isWithinDeadline = useMemo(() => {
    if (!config) return false;
    const now = new Date();
    const start = new Date(config.deadlineStart);
    const end = new Date(config.deadlineEnd);
    end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  }, [config]);

  const hasSubmitted = (evaluatorId: string) => {
    return submissions.some(s => s.evaluatorId === evaluatorId);
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="mb-4"
        >
          <Settings size={48} className="text-stone-300" />
        </motion.div>
        <p className="text-stone-400 font-medium animate-pulse">系統載入中...</p>
        {loadingError && (
          <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-3xl max-w-md w-full shadow-sm">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-3 font-bold">
              <AlertCircle size={20} />
              連線失敗
            </div>
            <p className="text-sm text-red-500 leading-relaxed mb-4">
              {loadingError}。<br/>
              這通常是因為 Firebase API Key 與 Project ID 不匹配，或資料庫權限設定不正確。
            </p>
            <div className="text-xs text-red-400 bg-white/50 p-3 rounded-xl border border-red-50/50">
              請檢查 <code className="font-mono">src/firebase.ts</code> 中的設定是否完整（包含 <code className="font-mono">projectId</code>, <code className="font-mono">appId</code> 等）。
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <HomeView 
            config={config} 
            evaluators={evaluators} 
            hasSubmitted={hasSubmitted}
            onSelectEvaluator={(e: Evaluator) => {
              setSelectedEvaluator(e);
              setView('evaluator');
            }}
            onAdminClick={() => setView('admin-login')}
            isWithinDeadline={isWithinDeadline}
          />
        )}
        {view === 'evaluator' && selectedEvaluator && (
          <EvaluatorView 
            evaluator={selectedEvaluator}
            config={config}
            physicians={physicians}
            items={items}
            onBack={() => setView('home')}
            isWithinDeadline={isWithinDeadline}
            existingSubmission={submissions.find(s => s.evaluatorId === selectedEvaluator.id)}
          />
        )}
        {view === 'admin-login' && (
          <AdminLoginView 
            correctPassword={config.adminPassword}
            onSuccess={() => {
              setIsLoggedIn(true);
              setView('admin');
            }}
            onBack={() => setView('home')}
          />
        )}
        {view === 'admin' && isLoggedIn && (
          <AdminDashboard 
            config={config}
            physicians={physicians}
            evaluators={evaluators}
            items={items}
            submissions={submissions}
            specialBonuses={specialBonuses}
            onBack={() => setView('home')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Views ---

function HomeView({ config, evaluators, onSelectEvaluator, onAdminClick, hasSubmitted, isWithinDeadline }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto px-6 py-12"
    >
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 text-stone-800">衛生福利部嘉南療養院</h1>
        <h2 className="text-2xl font-semibold text-stone-700">主治醫師公共服務績效統計</h2>
        <div className="mt-6 inline-block bg-white px-6 py-2 rounded-full shadow-sm border border-stone-200">
          <span className="text-stone-500 mr-2">當前統計月份:</span>
          <span className="font-bold text-emerald-600">{config.currentYear}年 {config.currentMonth}月</span>
        </div>
        {!isWithinDeadline && (
          <div className="mt-4 text-red-500 flex items-center justify-center gap-2">
            <AlertCircle size={18} />
            <span>目前非填寫期限內 ({westernToROCDate(config.deadlineStart)} ~ {westernToROCDate(config.deadlineEnd)})</span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evaluators.map((e: Evaluator) => (
          <button
            key={e.id}
            onClick={() => onSelectEvaluator(e)}
            className={cn(
              "p-6 rounded-2xl border transition-all text-left flex items-center justify-between group",
              hasSubmitted(e.id) 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-white border-stone-200 hover:border-stone-400 hover:shadow-md"
            )}
          >
            <div>
              <div className="text-sm opacity-60 uppercase tracking-wider mb-1">
                {e.role === 'director' ? '主任' : '專員'}
              </div>
              <div className="text-xl font-medium">{e.name}</div>
            </div>
            {hasSubmitted(e.id) ? (
              <UserCheck className="text-emerald-500" />
            ) : (
              <ChevronRight className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            )}
          </button>
        ))}
      </div>

      <footer className="mt-24 text-center">
        <button 
          onClick={onAdminClick}
          className="text-stone-300 hover:text-stone-500 transition-colors text-sm flex items-center gap-1 mx-auto"
        >
          <Lock size={14} />
          後台管理
        </button>
      </footer>
    </motion.div>
  );
}

function EvaluatorView({ evaluator, config, physicians, items, onBack, isWithinDeadline, existingSubmission }: any) {
  const [formData, setFormData] = useState<Record<string, Record<string, number>>>(
    existingSubmission?.data || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Filter items based on evaluator's assigned items
  const filteredItems = evaluator.assignedItems && evaluator.assignedItems.length > 0
    ? items.filter((item: EvaluationItem) => evaluator.assignedItems.includes(item.id))
    : items;

  const handleInputChange = (pId: string, iId: string, val: string) => {
    const num = parseInt(val) || 0;
    if (num < 0) return;
    setFormData(prev => ({
      ...prev,
      [pId]: {
        ...(prev[pId] || {}),
        [iId]: num
      }
    }));
  };

  const handleSubmit = async () => {
    if (!isWithinDeadline) {
      alert('目前非填寫期限內，無法送出。');
      return;
    }
    if (existingSubmission) {
      setShowConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      const submission: Submission = {
        evaluatorId: evaluator.id,
        year: config.currentYear,
        month: config.currentMonth,
        data: formData,
        submittedAt: serverTimestamp()
      };

      if (existingSubmission?.id) {
        await setDoc(doc(db, 'submissions', existingSubmission.id), submission);
      } else {
        await addDoc(collection(db, 'submissions'), submission);
      }
      alert('送出成功！');
      onBack();
    } catch (err) {
      console.error(err);
      alert('送出失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-7xl mx-auto px-6 py-12"
    >
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors">
          <ChevronLeft size={20} />
          返回首頁
        </button>
        <div className="text-right">
          <div className="text-sm text-stone-500">填寫人: {evaluator.name} ({evaluator.role === 'director' ? '主任' : '專員'})</div>
          <div className="text-lg font-bold text-emerald-600">{config.currentYear}年 {config.currentMonth}月 績效評核</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 font-semibold text-stone-600 sticky left-0 bg-stone-50 z-10 border-r border-stone-200">主治醫師</th>
                {filteredItems.map((item: EvaluationItem) => (
                  <th key={item.id} className="p-4 font-semibold text-stone-600 text-xs min-w-[120px] border-r border-stone-200 last:border-r-0">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {physicians.map((p: Physician) => (
                <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="p-4 font-medium sticky left-0 bg-white z-10 border-r border-stone-200">{p.name}</td>
                  {filteredItems.map((item: EvaluationItem) => (
                    <td key={item.id} className="p-2 border-r border-stone-100 last:border-r-0">
                      <input 
                        type="number"
                        min="0"
                        value={formData[p.id]?.[item.id] ?? ''}
                        onChange={(e) => handleInputChange(p.id, item.id, e.target.value)}
                        placeholder="0"
                        disabled={!isWithinDeadline}
                        className="w-full p-2 bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded outline-none transition-all text-center"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !isWithinDeadline}
          className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
        >
          {isSubmitting ? '送出中...' : (
            <>
              <Save size={20} />
              儲存並送出
            </>
          )}
        </button>
      </div>

      <ConfirmModal 
        isOpen={showConfirm}
        title="確認覆蓋紀錄"
        message="您已經填寫過本月紀錄，確定要覆蓋之前的紀錄嗎？"
        onConfirm={executeSubmit}
        onCancel={() => setShowConfirm(false)}
      />
    </motion.div>
  );
}

function AdminLoginView({ correctPassword, onSuccess, onBack }: any) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-center min-h-screen p-6"
    >
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-200 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-stone-100 rounded-full">
            <Lock className="text-stone-600" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-8">後台管理登入</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">管理員密碼</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "w-full p-4 bg-stone-50 border rounded-2xl outline-none transition-all",
                error ? "border-red-500 ring-2 ring-red-100" : "border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
              )}
              placeholder="請輸入密碼"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-2">密碼錯誤，請重新輸入</p>}
          </div>
          <button className="w-full bg-stone-800 text-white p-4 rounded-2xl hover:bg-stone-900 transition-all font-semibold">
            登入系統
          </button>
          <button type="button" onClick={onBack} className="w-full text-stone-400 hover:text-stone-600 transition-colors text-sm">
            返回首頁
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function AdminDashboard({ config, physicians, evaluators, items, submissions, specialBonuses, onBack }: any) {
  const [activeTab, setActiveTab] = useState<'system' | 'personnel' | 'items' | 'records' | 'report'>('system');

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 p-6 flex flex-col">
        <div className="mb-12">
          <h1 className="text-xl font-bold text-stone-800">管理系統</h1>
          <p className="text-xs text-stone-400 mt-1">嘉南療養院 績效統計</p>
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Cloud Synced</span>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <AdminNavItem active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Settings size={18} />} label="系統設定" />
          <AdminNavItem active={activeTab === 'personnel'} onClick={() => setActiveTab('personnel')} icon={<UserPlus size={18} />} label="人員管理" />
          <AdminNavItem active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon={<Plus size={18} />} label="評分項目" />
          <AdminNavItem active={activeTab === 'records'} onClick={() => setActiveTab('records')} icon={<Search size={18} />} label="評分紀錄管理" />
          <AdminNavItem active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={<FileText size={18} />} label="績效報表" />
        </nav>

        <button onClick={onBack} className="mt-auto flex items-center gap-2 text-stone-400 hover:text-stone-800 transition-colors pt-6 border-t border-stone-100">
          <LogOut size={18} />
          退出後台
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'system' && <SystemSettings key="system" config={config} />}
          {activeTab === 'personnel' && <PersonnelManagement key="personnel" physicians={physicians} evaluators={evaluators} config={config} specialBonuses={specialBonuses} items={items} />}
          {activeTab === 'items' && <ItemManagement key="items" items={items} />}
          {activeTab === 'records' && <RecordManagement key="records" submissions={submissions} evaluators={evaluators} config={config} />}
          {activeTab === 'report' && <PerformanceReport key="report" physicians={physicians} items={items} submissions={submissions} specialBonuses={specialBonuses} config={config} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AdminNavItem({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
        active ? "bg-stone-900 text-white shadow-lg shadow-stone-200" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Admin Sub-Tabs ---

function SystemSettings({ config }: { config: SystemConfig, key?: string }) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = async () => {
    if (localConfig.currentMonth < 1 || localConfig.currentMonth > 12) {
      alert('月份必須在 1-12 之間');
      return;
    }
    
    const changed = localConfig.currentYear !== config.currentYear || localConfig.currentMonth !== config.currentMonth;

    try {
      await updateDoc(doc(db, 'config', 'main'), localConfig as any);
      alert('系統設定已更新！' + (changed ? '(年月變更，新月份加分已重設)' : ''));
    } catch (err) {
      alert('儲存失敗');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-8">系統設定</h2>
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-500 mb-2">系統年份 (民國)</label>
            <input 
              type="number"
              value={localConfig.currentYear}
              onChange={(e) => setLocalConfig({ ...localConfig, currentYear: parseInt(e.target.value) || 0 })}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-500 mb-2">系統月份</label>
            <input 
              type="number"
              min="1"
              max="12"
              value={localConfig.currentMonth}
              onChange={(e) => setLocalConfig({ ...localConfig, currentMonth: parseInt(e.target.value) || 0 })}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-500 mb-2">填寫期限 (開始) - 民國年格式 YYY-MM-DD</label>
            <input 
              type="text"
              placeholder="例如: 115-03-01"
              value={westernToROCDate(localConfig.deadlineStart)}
              onChange={(e) => setLocalConfig({ ...localConfig, deadlineStart: rocToWesternDate(e.target.value) })}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-500 mb-2">填寫期限 (結束) - 民國年格式 YYY-MM-DD</label>
            <input 
              type="text"
              placeholder="例如: 115-03-31"
              value={westernToROCDate(localConfig.deadlineEnd)}
              onChange={(e) => setLocalConfig({ ...localConfig, deadlineEnd: rocToWesternDate(e.target.value) })}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-500 mb-2">後台登入密碼</label>
          <input 
            type="text"
            value={localConfig.adminPassword}
            onChange={(e) => setLocalConfig({ ...localConfig, adminPassword: e.target.value })}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all font-semibold flex items-center justify-center gap-2"
        >
          <Save size={20} />
          儲存設定
        </button>
      </div>
    </motion.div>
  );
}

function PersonnelManagement({ physicians, evaluators, config, specialBonuses, items }: any) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'physician' | 'specialist' | 'director'>('physician');
  const [confirmData, setConfirmData] = useState<{ id: string, type: 'physician' | 'evaluator' } | null>(null);
  const [assigningEvaluator, setAssigningEvaluator] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || isAdding) return;
    setIsAdding(true);
    try {
      if (newRole === 'physician') {
        await addDoc(collection(db, 'physicians'), { name: newName });
      } else {
        await addDoc(collection(db, 'evaluators'), { name: newName, role: newRole });
      }
      setNewName('');
    } catch (err: any) {
      console.error(err);
      alert('新增人員失敗: ' + (err.message || '未知錯誤'));
    } finally {
      setIsAdding(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmData) return;
    const data = confirmData;
    setConfirmData(null);
    try {
      await deleteDoc(doc(db, data.type === 'physician' ? 'physicians' : 'evaluators', data.id));
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const handleBonusChange = async (pId: string, val: string) => {
    const points = parseInt(val) || 0;
    if (points < 0) return;

    const existing = specialBonuses.find((b: any) => b.physicianId === pId);
    try {
      if (existing?.id) {
        await updateDoc(doc(db, 'specialBonuses', existing.id), { points });
      } else {
        await addDoc(collection(db, 'specialBonuses'), {
          physicianId: pId,
          year: config.currentYear,
          month: config.currentMonth,
          points
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div>
        <h2 className="text-2xl font-bold mb-8">人員管理</h2>
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-stone-500 mb-2">姓名</label>
            <input 
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              placeholder="輸入姓名"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-stone-500 mb-2">身分</label>
            <select 
              value={newRole}
              onChange={(e: any) => setNewRole(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none"
            >
              <option value="physician">主治醫師</option>
              <option value="specialist">專員</option>
              <option value="director">主任</option>
            </select>
          </div>
          <button 
            onClick={handleAdd} 
            disabled={isAdding}
            className="bg-stone-800 text-white px-8 py-3 rounded-xl hover:bg-stone-900 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isAdding ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Settings size={20} /></motion.div> : <Plus size={20} />}
            {isAdding ? '儲存中...' : '新增人員'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <UserCheck className="text-emerald-600" size={20} />
            主治醫師名單 ({config.currentYear}年 {config.currentMonth}月 特殊加分)
          </h3>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">姓名</th>
                  <th className="p-4">當月特殊加分</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {physicians.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className="p-4">
                      <input 
                        type="number"
                        min="0"
                        value={specialBonuses.find((b: any) => b.physicianId === p.id)?.points ?? ''}
                        onChange={(e) => handleBonusChange(p.id, e.target.value)}
                        placeholder="0"
                        className="w-24 p-2 bg-stone-50 border border-stone-100 rounded-lg text-center focus:bg-white outline-none"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setConfirmData({ id: p.id, type: 'physician' })} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Settings className="text-blue-600" size={20} />
            評分人員名單
          </h3>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">姓名</th>
                  <th className="p-4">身分</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {evaluators.map(e => (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="p-4 font-medium">{e.name}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-bold",
                        e.role === 'director' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {e.role === 'director' ? '主任' : '專員'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setAssigningEvaluator(e)}
                          className="text-stone-400 hover:text-emerald-600 transition-colors"
                          title="設定評分項目"
                        >
                          <ListChecks size={18} />
                        </button>
                        <button onClick={() => setConfirmData({ id: e.id, type: 'evaluator' })} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmData}
        title="確認刪除人員"
        message="您確定要刪除此人員嗎？這可能會影響到該人員相關的評分紀錄。"
        onConfirm={executeDelete}
        onCancel={() => setConfirmData(null)}
      />

      <ItemAssignmentModal 
        isOpen={!!assigningEvaluator}
        evaluator={assigningEvaluator}
        items={items}
        onClose={() => setAssigningEvaluator(null)}
      />
    </motion.div>
  );
}

function ItemAssignmentModal({ isOpen, evaluator, items, onClose }: any) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (evaluator) {
      setSelectedIds(evaluator.assignedItems || []);
    }
  }, [evaluator]);

  if (!isOpen || !evaluator) return null;

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'evaluators', evaluator.id), {
        assignedItems: selectedIds
      });
      onClose();
    } catch (err) {
      alert('儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">設定評分項目</h3>
            <p className="text-sm text-stone-500">人員: {evaluator.name}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            {items.map((item: any) => (
              <label 
                key={item.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                  selectedIds.includes(item.id) 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                    : "bg-stone-50 border-transparent text-stone-600 hover:bg-stone-100"
                )}
              >
                <input 
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => handleToggle(item.id)}
                  className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs opacity-60">{item.points} 點 / {item.unit}</div>
                </div>
              </label>
            ))}
          </div>
          {items.length === 0 && (
            <div className="text-center py-8 text-stone-400">尚未建立評分項目</div>
          )}
        </div>

        <div className="p-6 bg-stone-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium text-stone-600 hover:bg-stone-100 transition-all"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl font-medium bg-stone-900 text-white hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Settings size={20} /></motion.div> : <Save size={20} />}
            儲存設定
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ItemManagement({ items }: { items: EvaluationItem[], key?: string }) {
  const [newItem, setNewItem] = useState({ name: '', points: 1000, unit: '次' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update order in Firestore
      const batch = writeBatch(db);
      newItems.forEach((item, index) => {
        const docRef = doc(db, 'items', item.id);
        batch.update(docRef, { order: index });
      });
      
      try {
        await batch.commit();
      } catch (err) {
        console.error("Failed to update order:", err);
      }
    }
  };

  const handleAdd = async () => {
    if (!newItem.name.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const itemWithOrder = {
        ...newItem,
        order: items.length
      };
      await addDoc(collection(db, 'items'), itemWithOrder);
      setNewItem({ name: '', points: 1000, unit: '次' });
    } catch (err: any) {
      console.error(err);
      alert('新增項目失敗: ' + (err.message || '未知錯誤'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsResetting(true);
  };

  const executeReset = async () => {
    setIsResetting(false);
    const defaultItems = [
      { name: '出席科會 1000點/次 (含看門診醫師)', points: 1000, unit: '次' },
      { name: '出席住院醫師期刊討論會 1000點/次 (含看門診醫師)', points: 1000, unit: '次' },
      { name: '出席外賓演講 1000點/次', points: 1000, unit: '次' },
      { name: '該月份未被健保核刪 1000點/月', points: 1000, unit: '月' },
      { name: 'RRC 計畫主持人 2000點/月', points: 2000, unit: '月' },
      { name: '協助開立評鑑相關課程 2000點/次', points: 2000, unit: '次' },
      { name: '擔任評鑑條文指導醫師 2000點/月', points: 2000, unit: '月' },
      { name: '協助修改ISO文件 2000點/次', points: 2000, unit: '次' },
      { name: '國內壁報發表 (主要作者) 3000點/次 (3個月)', points: 3000, unit: '次' },
      { name: '國外壁報發表 (主要作者) 3000點/次(6個月)', points: 3000, unit: '次' },
      { name: '國內論文發表 (主要作者) 3000點/次(6個月)', points: 3000, unit: '次' },
      { name: 'SCI論文發表 (主要作者) 3000點/次(12個月)', points: 3000, unit: '次' }
    ];

    try {
      const batch = writeBatch(db);
      let currentMaxOrder = items.length > 0 ? Math.max(...items.map(i => i.order ?? 0)) + 1 : 0;
      
      defaultItems.forEach(item => {
        if (!items.some(existing => existing.name === item.name)) {
          const newDocRef = doc(collection(db, 'items'));
          batch.set(newDocRef, { ...item, order: currentMaxOrder++ });
        }
      });
      await batch.commit();
      alert('預設項目已成功加入！');
    } catch (err) {
      alert('重設失敗');
    }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (err) {
      alert('刪除失敗');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">評分項目管理</h2>
        <button 
          onClick={handleResetDefaults}
          className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all text-sm font-bold flex items-center gap-2"
        >
          <CheckCircle size={16} />
          重設為預設項目
        </button>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex gap-4 items-end mb-8">
        <div className="flex-1">
          <label className="block text-sm font-medium text-stone-500 mb-2">項目名稱</label>
          <input 
            type="text"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none"
            placeholder="例如: 出席科會"
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-stone-500 mb-2">點數</label>
          <input 
            type="number"
            value={newItem.points}
            onChange={(e) => setNewItem({ ...newItem, points: parseInt(e.target.value) || 0 })}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none"
          />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium text-stone-500 mb-2">單位</label>
          <input 
            type="text"
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none"
            placeholder="次/月"
          />
        </div>
        <button 
          onClick={handleAdd} 
          disabled={isAdding}
          className="bg-stone-800 text-white px-8 py-3 rounded-xl hover:bg-stone-900 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isAdding ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Settings size={20} /></motion.div> : <Plus size={20} />}
          {isAdding ? '儲存中...' : '新增項目'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 w-12"></th>
                <th className="p-4">項目名稱</th>
                <th className="p-4">點數 / 單位</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <SortableContext 
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map(item => (
                  <SortableItem key={item.id} item={item} onDelete={() => setDeleteId(item.id)} />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        title="確認刪除項目"
        message="您確定要刪除此評分項目嗎？這將會影響到所有包含此項目的評分計算。"
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal 
        isOpen={isResetting}
        title="確認重設項目"
        message="您確定要將評分項目重設為預設清單嗎？這將會補齊所有缺失的預設項目。"
        onConfirm={executeReset}
        onCancel={() => setIsResetting(false)}
      />
    </motion.div>
  );
}

function SortableItem({ item, onDelete }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: item.name, points: item.points, unit: item.unit });
  const [isSaving, setIsSaving] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  const handleSave = async () => {
    if (!editData.name.trim()) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'items', item.id), editData);
      setIsEditing(false);
    } catch (err) {
      alert('儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({ name: item.name, points: item.points, unit: item.unit });
    setIsEditing(false);
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "hover:bg-stone-50 transition-colors",
        isDragging && "bg-white shadow-2xl ring-2 ring-emerald-500/20",
        isEditing && "bg-stone-50"
      )}
    >
      <td className="p-4">
        {!isEditing && (
          <button 
            {...attributes} 
            {...listeners}
            className="text-stone-300 hover:text-stone-600 cursor-grab active:cursor-grabbing p-1"
          >
            <GripVertical size={18} />
          </button>
        )}
      </td>
      <td className="p-4">
        {isEditing ? (
          <input 
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full p-2 bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        ) : (
          <span className="font-medium">{item.name}</span>
        )}
      </td>
      <td className="p-4">
        {isEditing ? (
          <div className="flex gap-2">
            <input 
              type="number"
              value={editData.points}
              onChange={(e) => setEditData({ ...editData, points: parseInt(e.target.value) || 0 })}
              className="w-24 p-2 bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <input 
              type="text"
              value={editData.unit}
              onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
              className="w-16 p-2 bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        ) : (
          <span className="text-stone-500">{item.points} 點 / {item.unit}</span>
        )}
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="text-emerald-600 hover:text-emerald-700 p-1"
              >
                {isSaving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Settings size={18} /></motion.div> : <CheckCircle size={18} />}
              </button>
              <button 
                onClick={handleCancel}
                disabled={isSaving}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <Edit2 size={18} />
              </button>
              <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function RecordManagement({ submissions, evaluators, config }: any) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const executeDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await deleteDoc(doc(db, 'submissions', id));
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const executeDeleteAll = async () => {
    setIsDeletingAll(false);
    try {
      const batch = writeBatch(db);
      submissions.forEach((s: any) => {
        if (s.id) batch.delete(doc(db, 'submissions', s.id));
      });
      await batch.commit();
      alert('已刪除本月所有紀錄');
    } catch (err) {
      alert('刪除失敗');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">評分紀錄管理 ({config.currentYear}年 {config.currentMonth}月)</h2>
        <button 
          onClick={() => setIsDeletingAll(true)}
          disabled={submissions.length === 0}
          className="bg-red-50 text-red-600 px-6 py-2 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-50"
        >
          <Trash2 size={16} />
          一鍵刪除當月所有資料
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evaluators.map((e: any) => {
          const sub = submissions.find((s: any) => s.evaluatorId === e.id);
          return (
            <div key={e.id} className={cn(
              "p-6 rounded-3xl border transition-all",
              sub ? "bg-white border-stone-200 shadow-sm" : "bg-stone-100 border-transparent opacity-60"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    sub ? "bg-emerald-100 text-emerald-600" : "bg-stone-200 text-stone-400"
                  )}>
                    {sub ? <UserCheck size={20} /> : <UserX size={20} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{e.name}</div>
                    <div className="text-xs text-stone-400">{e.role === 'director' ? '主任' : '專員'}</div>
                  </div>
                </div>
                {sub && (
                  <button onClick={() => setDeleteId(sub.id!)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="text-xs">
                {sub ? (
                  <span className="text-emerald-600 font-medium">已於 {sub.submittedAt?.toDate().toLocaleString() ?? '未知時間'} 填寫完畢</span>
                ) : (
                  <span className="text-stone-400">尚未填寫</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        title="確認刪除紀錄"
        message="您確定要刪除這筆評分紀錄嗎？刪除後該人員需重新填寫。"
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal 
        isOpen={isDeletingAll}
        title="確認刪除所有紀錄"
        message="您確定要刪除本月「所有」評分紀錄嗎？此動作無法復原！"
        onConfirm={executeDeleteAll}
        onCancel={() => setIsDeletingAll(false)}
      />
    </motion.div>
  );
}

function PerformanceReport({ physicians, items, submissions, specialBonuses, config }: any) {
  const [reportYear, setReportYear] = useState(config.currentYear);
  const [reportMonth, setReportMonth] = useState(config.currentMonth);
  const [historicalSubmissions, setHistoricalSubmissions] = useState<Submission[]>([]);
  const [historicalBonuses, setHistoricalBonuses] = useState<SpecialBonus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const qSub = query(collection(db, 'submissions'), where('year', '==', reportYear), where('month', '==', reportMonth));
      const qBonus = query(collection(db, 'specialBonuses'), where('year', '==', reportYear), where('month', '==', reportMonth));
      
      const [subSnap, bonusSnap] = await Promise.all([getDocs(qSub), getDocs(qBonus)]);
      
      setHistoricalSubmissions(subSnap.docs.map(d => d.data() as Submission));
      setHistoricalBonuses(bonusSnap.docs.map(d => d.data() as SpecialBonus));
    } catch (err) {
      alert('查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const calculatePoints = (pId: string) => {
    const itemTotals: Record<string, number> = {};
    let total = 0;

    items.forEach((item: EvaluationItem) => {
      let count = 0;
      historicalSubmissions.forEach(sub => {
        count += sub.data[pId]?.[item.id] || 0;
      });
      const points = count * item.points;
      itemTotals[item.id] = points;
      total += points;
    });

    const bonus = historicalBonuses.find(b => b.physicianId === pId)?.points || 0;
    total += bonus;

    return { itemTotals, bonus, total };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">績效報表查詢</h2>
        <div className="flex gap-4 items-center bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 px-3">
            <span className="text-sm text-stone-500">年份:</span>
            <input 
              type="number" 
              value={reportYear} 
              onChange={(e) => setReportYear(parseInt(e.target.value) || 0)}
              className="w-20 p-1 border-b border-stone-200 outline-none text-center"
            />
          </div>
          <div className="flex items-center gap-2 px-3">
            <span className="text-sm text-stone-500">月份:</span>
            <input 
              type="number" 
              min="1" 
              max="12" 
              value={reportMonth} 
              onChange={(e) => setReportMonth(parseInt(e.target.value) || 0)}
              className="w-16 p-1 border-b border-stone-200 outline-none text-center"
            />
          </div>
          <button 
            onClick={fetchReport}
            className="bg-stone-800 text-white px-6 py-2 rounded-xl hover:bg-stone-900 transition-all text-sm font-bold"
          >
            查詢報表
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-stone-400">查詢中...</div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <div className="font-bold text-stone-700">{reportYear}年 {reportMonth}月 績效統計總表</div>
            <div className="text-xs text-stone-400">統計對象: {physicians.length} 位主治醫師</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="p-4 text-xs font-bold text-stone-500 sticky left-0 bg-stone-50 z-10 border-r border-stone-100">醫師姓名</th>
                  {items.map((item: any) => (
                    <th key={item.id} className="p-4 text-xs font-bold text-stone-500 min-w-[120px] text-center border-r border-stone-100">
                      {item.name}
                    </th>
                  ))}
                  <th className="p-4 text-xs font-bold text-emerald-600 text-center border-r border-stone-100 bg-emerald-50/30">特殊加分</th>
                  <th className="p-4 text-xs font-bold text-stone-800 text-center bg-stone-100/50">總點數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {physicians.map((p: Physician) => {
                  const { itemTotals, bonus, total } = calculatePoints(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-4 font-bold sticky left-0 bg-white z-10 border-r border-stone-100">{p.name}</td>
                      {items.map((item: any) => (
                        <td key={item.id} className="p-4 text-center text-stone-600 border-r border-stone-100">
                          {itemTotals[item.id].toLocaleString()}
                        </td>
                      ))}
                      <td className="p-4 text-center font-bold text-emerald-600 border-r border-stone-100 bg-emerald-50/20">
                        {bonus.toLocaleString()}
                      </td>
                      <td className="p-4 text-center font-black text-stone-900 bg-stone-50/30">
                        {total.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {historicalSubmissions.length === 0 && (
            <div className="p-12 text-center text-stone-400 italic">
              該月份尚無評分紀錄
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
