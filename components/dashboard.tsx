'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { useMembers } from '@/lib/hooks/use-members';
import { useBalances } from '@/lib/hooks/use-balances';
import { formatCents, parseCentsFromEuros } from '@/lib/format';
import { 
  Wallet, 
  Receipt, 
  Users,
  Activity, 
  Settings,
  LogOut,
  Plus,
  Sun,
  Moon,
  ArrowRight,
  Check,
  Pencil,
  Trash2,
  Camera,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  X,
  Download,
  PieChart,
  Home,
  Zap,
  Wifi,
  ShoppingCart,
  Car,
  Utensils,
  Gamepad2,
  MoreHorizontal,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Percent,
  MessageCircle,
  Send,
  Undo2,
  Scan,
  Eye,
  Loader2,
  AtSign,
  Archive,
  Image,
  Grid,
  List,
  Calendar,
  Dices,
  Lock,
  Info,
  Sparkles,
  CheckCircle,
  Mic,
  Radio,
  AlertCircle,
  Volume2,
  DollarSign,
  Sofa,
  Scale,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useTheme } from './theme-provider';
import toast from 'react-hot-toast';
import { RecurringSection } from './sections/recurring-section';

interface DashboardProps {
  user: {
    id: string;
    displayName: string;
    isAdmin: boolean;
  };
  onLogout: () => void;
}

interface Expense {
  id: string;
  description: string;
  amountCents: number;
  paidBy: { id: string; displayName: string };
  month: string;
  category: string;
  notes?: string;
  isRecurring: boolean;
  billPhotoUrl?: string;
  splits: { memberId: string; shareCents: number; member: { displayName: string } }[];
  createdAt: string;
}

interface Settlement {
  id: string;
  fromMember: { id: string; displayName: string };
  toMember: { id: string; displayName: string };
  amountCents: number;
  month: string;
  paymentMethod: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  metadata: any;
  createdAt: string;
}

interface Budget {
  id: string;
  monthlyLimit: number;
  alertAt: number;
}

interface ChatMessage {
  id: string;
  content: string;
  mentions: string[];
  member: { id: string; displayName: string };
  createdAt: string;
}

interface UndoAction {
  id: string;
  actionType: string;
  entityType: string;
  entityData: any;
  expiresAt: string;
  creatorName?: string;
  isOwn?: boolean;
}

// Category configuration
const CATEGORIES = [
  { id: 'rent', label: 'Rent', icon: Home, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { id: 'utilities', label: 'Utilities', icon: Zap, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart, color: 'bg-green-500', textColor: 'text-green-500' },
  { id: 'internet', label: 'Internet', icon: Wifi, color: 'bg-purple-500', textColor: 'text-purple-500' },
  { id: 'entertainment', label: 'Entertainment', icon: Gamepad2, color: 'bg-pink-500', textColor: 'text-pink-500' },
  { id: 'transport', label: 'Transport', icon: Car, color: 'bg-orange-500', textColor: 'text-orange-500' },
  { id: 'dining', label: 'Dining', icon: Utensils, color: 'bg-red-500', textColor: 'text-red-500' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-500', textColor: 'text-gray-500' },
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { id: 'paypal', label: 'PayPal', icon: Smartphone },
  { id: 'venmo', label: 'Venmo', icon: Smartphone },
  { id: 'revolut', label: 'Revolut', icon: Smartphone },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

// Avatar colors based on name
const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, avatarUrl, size = 'md' }: { name: string; avatarUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(name)} rounded-full flex items-center justify-center text-white font-semibold overflow-hidden`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function CategoryIcon({ category, size = 'md' }: { category: string; size?: 'sm' | 'md' }) {
  const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[CATEGORIES.length - 1];
  const Icon = cat.icon;
  const sizeClasses = size === 'sm' ? 'w-6 h-6 p-1' : 'w-8 h-8 p-1.5';
  return (
    <div className={`${sizeClasses} ${cat.color} rounded-lg flex items-center justify-center`}>
      <Icon className="w-full h-full text-white" />
    </div>
  );
}

// Render text with @mentions highlighted
function RenderWithMentions({ text, members }: { text: string; members: { id: string; displayName: string }[] }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const name = part.slice(1);
          const member = members.find(m => m.displayName.toLowerCase().replace(/\s+/g, '') === name.toLowerCase());
          if (member) {
            return (
              <span key={i} className="bg-teal-500/20 text-teal-600 dark:text-teal-300 px-1 rounded font-medium">
                {part}
              </span>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('expenses');
  const { theme, toggleTheme } = useTheme();
  const { members } = useMembers();
  const { balances, simplifyDebts, simplifiedDebts, refetch: refetchBalances } = useBalances();
  const [simplifyDebtsLoading, setSimplifyDebtsLoading] = useState(false);
  
  // Profile edit states
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploadMethod, setAvatarUploadMethod] = useState<'url' | 'upload'>('url');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  
  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetInfo, setBudgetInfo] = useState<{ currentSpent: number; percentUsed: number; isOverBudget: boolean; isNearLimit: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  // Shopping list states
  interface ShoppingItem {
    id: string;
    name: string;
    quantity: string | null;
    category: string;
    purchased: boolean;
    purchasedAt: string | null;
    createdAt: string;
    addedBy: { id: string; displayName: string; avatarUrl: string | null };
    purchasedBy: { id: string; displayName: string; avatarUrl: string | null } | null;
  }
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [newShoppingQuantity, setNewShoppingQuantity] = useState('');
  const [shoppingCategory, setShoppingCategory] = useState('groceries');
  const [shoppingLoading, setShoppingLoading] = useState(false);

  // Smart Grocery Prediction states
  interface GroceryItemPrediction {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    purchaseDate: string;
    status: 'active' | 'finished';
    avgDailyUsage: number | null;
    remainingQuantity: number;
    daysLeft: number | null;
    predictedFinishDate: string | null;
    urgencyLevel: 'green' | 'yellow' | 'red' | 'unknown';
    isFinishingSoon: boolean;
  }
  interface SmartSuggestion {
    itemName: string;
    daysLeft: number;
    predictedFinishDate: string;
    message: string;
  }
  const [groceryPredictionOpen, setGroceryPredictionOpen] = useState(false);
  const [groceryItems, setGroceryItems] = useState<GroceryItemPrediction[]>([]);
  const [grocerySuggestions, setGrocerySuggestions] = useState<SmartSuggestion[]>([]);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [newGroceryName, setNewGroceryName] = useState('');
  const [newGroceryQuantity, setNewGroceryQuantity] = useState('');
  const [newGroceryUnit, setNewGroceryUnit] = useState('pieces');

  // Chore/Cleaning states
  interface Chore {
    id: string;
    name: string;
    icon: string;
    frequency: string;
    active: boolean;
  }
  interface ChoreAssignment {
    id: string;
    assignedTo: { id: string; displayName: string; avatarUrl: string | null };
    periodStart: string;
    periodEnd: string;
    completedAt: string | null;
  }
  interface ChoreWithAssignment {
    chore: { id: string; name: string; icon: string; frequency: string };
    assignment: ChoreAssignment | null;
  }
  const [chores, setChores] = useState<Chore[]>([]);
  const [choreAssignments, setChoreAssignments] = useState<ChoreWithAssignment[]>([]);
  const [choresLoading, setChoresLoading] = useState(false);
  const [addChoreOpen, setAddChoreOpen] = useState(false);
  const [newChoreName, setNewChoreName] = useState('');
  const [newChoreIcon, setNewChoreIcon] = useState('🧹');
  const [newChoreFrequency, setNewChoreFrequency] = useState('weekly');
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Undo state
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(0);
  
  // House Voice states
  interface HouseVoicePost {
    id: string;
    type: string;
    content: string;
    createdAt: string;
  }
  interface HouseSignal {
    id: string;
    category: string;
    categoryLabel: string;
    categoryIcon: string;
    message: string | null;
    timeAgo: string;
  }
  const [houseVoicePosts, setHouseVoicePosts] = useState<HouseVoicePost[]>([]);
  const [houseSignals, setHouseSignals] = useState<HouseSignal[]>([]);
  const [houseVoiceOpen, setHouseVoiceOpen] = useState(false);
  const [signalCategory, setSignalCategory] = useState('');
  const [signalMessage, setSignalMessage] = useState('');
  const [signalSubmitting, setSignalSubmitting] = useState(false);
  const [houseVoiceLoading, setHouseVoiceLoading] = useState(false);
  
  const SIGNAL_CATEGORIES = [
    { id: 'cleaning', label: 'Cleaning', icon: '🧹', placeholder: 'e.g., "Some shared areas need more attention"' },
    { id: 'noise', label: 'Noise', icon: '🔊', placeholder: 'e.g., "Noise levels have been higher lately"' },
    { id: 'expenses', label: 'Expenses', icon: '💰', placeholder: 'e.g., "Some expenses seem unbalanced"' },
    { id: 'shared_space', label: 'Shared Space', icon: '🛋️', placeholder: 'e.g., "Common areas need better organization"' },
    { id: 'fairness', label: 'Fairness', icon: '⚖️', placeholder: 'e.g., "Workload distribution could improve"' },
    { id: 'other', label: 'Other', icon: '💬', placeholder: 'e.g., "General feedback for the house"' },
  ];
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [settleUpOpen, setSettleUpOpen] = useState(false);
  const [editSettlement, setEditSettlement] = useState<Settlement | null>(null);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [chartTab, setChartTab] = useState<'category' | 'trends' | 'members'>('category');
  const [monthlyTrends, setMonthlyTrends] = useState<{ month: string; amount: number }[]>([]);
  const [splitHistoryExpense, setSplitHistoryExpense] = useState<Expense | null>(null);
  
  // OCR state
  const [scanning, setScanning] = useState(false);
  
  // Expense form
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState('');
  const [category, setCategory] = useState('other');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [percentSplits, setPercentSplits] = useState<Record<string, string>>({});
  const [billFile, setBillFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Settlement form
  const [settleFromId, setSettleFromId] = useState('');
  const [settleToId, setSettleToId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Budget form
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetAlertAt, setBudgetAlertAt] = useState('80');

  // Archive/Search state
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveCategory, setArchiveCategory] = useState('all');
  const [archiveViewMode, setArchiveViewMode] = useState<'gallery' | 'list'>('gallery');
  const [archiveResults, setArchiveResults] = useState<{
    expenses: Expense[];
    settlements: Settlement[];
    receipts: Expense[];
    totalExpenses: number;
    totalSettlements: number;
    totalReceipts: number;
  } | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Expense | null>(null);

  // Who Pays spinner state
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const [spinnerWeighted, setSpinnerWeighted] = useState(true);
  const [spinnerRotation, setSpinnerRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinnerWinner, setSpinnerWinner] = useState<string | null>(null);

  // Debt breakdown modal state
  const [debtBreakdownMember, setDebtBreakdownMember] = useState<{ id: string; name: string } | null>(null);

  // Smart Settle modal state (visible to all users)
  const [smartSettleOpen, setSmartSettleOpen] = useState(false);
  const [smartSettleSuggestions, setSmartSettleSuggestions] = useState<Array<{fromId: string; fromName: string; toId: string; toName: string; amountCents: number}>>([]);
  const [loadingSmartSettle, setLoadingSmartSettle] = useState(false);

  // Push notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetchData();
  }, []);

  // Check push notification support and subscription status
  useEffect(() => {
    const checkNotifications = async () => {
      // Check if notifications are supported
      if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
        setNotificationsSupported(true);
        
        // Check if already subscribed
        try {
          const res = await fetch('/api/push/subscribe');
          const data = await res.json();
          setNotificationsEnabled(data.subscribed);
        } catch (err) {
          console.error('Failed to check notification status:', err);
        }
      }
    };
    checkNotifications();
  }, []);

  useEffect(() => {
    if (members.length > 0 && !paidById) {
      setPaidById(user.id || members[0]?.id || '');
    }
  }, [members, paidById, user.id]);

  // Fetch undo action periodically
  useEffect(() => {
    const fetchUndo = async () => {
      try {
        const res = await fetch('/api/undo');
        const data = await res.json();
        if (data.undoAction) {
          setUndoAction(data.undoAction);
          const expiresIn = Math.max(0, Math.floor((new Date(data.undoAction.expiresAt).getTime() - Date.now()) / 1000));
          setUndoCountdown(expiresIn);
        } else {
          setUndoAction(null);
          setUndoCountdown(0);
        }
      } catch {
        // Ignore
      }
    };
    fetchUndo();
    const interval = setInterval(fetchUndo, 10000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for undo
  useEffect(() => {
    if (undoCountdown > 0) {
      const timer = setTimeout(() => setUndoCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (undoAction && undoCountdown === 0) {
      setUndoAction(null);
    }
  }, [undoCountdown, undoAction]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Fetch chat when tab changes and poll for updates
  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChatMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(fetchChatMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Fetch chores when cleaning tab is active
  useEffect(() => {
    if (activeTab === 'cleaning') {
      fetchChores();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, settRes, actRes, budgetRes, shoppingRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/settlements'),
        fetch('/api/activity'),
        fetch('/api/budget'),
        fetch('/api/shopping')
      ]);
      const [expData, settData, actData, budgetData, shoppingData] = await Promise.all([
        expRes.json(),
        settRes.json(),
        actRes.json(),
        budgetRes.json(),
        shoppingRes.json()
      ]);
      setExpenses(expData?.expenses ?? []);
      setSettlements(settData?.settlements ?? []);
      setActivities(actData?.activities ?? []);
      setBudget(budgetData?.budget ?? null);
      setBudgetInfo(budgetData ? {
        currentSpent: budgetData.currentSpent,
        percentUsed: budgetData.percentUsed,
        isOverBudget: budgetData.isOverBudget,
        isNearLimit: budgetData.isNearLimit
      } : null);
      setShoppingItems(shoppingData?.items ?? []);
    } catch {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Shopping list handlers
  const fetchShoppingItems = async () => {
    try {
      const res = await fetch('/api/shopping');
      const data = await res.json();
      setShoppingItems(data?.items ?? []);
    } catch {
      console.error('Failed to fetch shopping items');
    }
  };

  const handleAddShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoppingItem.trim()) return;
    
    setShoppingLoading(true);
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newShoppingItem,
          quantity: newShoppingQuantity || null,
          category: shoppingCategory
        })
      });
      if (res.ok) {
        setNewShoppingItem('');
        setNewShoppingQuantity('');
        fetchShoppingItems();
        toast.success('Item added to list');
      }
    } catch {
      toast.error('Failed to add item');
    } finally {
      setShoppingLoading(false);
    }
  };

  const handleTogglePurchased = async (id: string, purchased: boolean) => {
    try {
      const res = await fetch(`/api/shopping/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchased })
      });
      if (res.ok) {
        fetchShoppingItems();
        toast.success(purchased ? 'Marked as purchased!' : 'Unmarked');
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDeleteShoppingItem = async (id: string) => {
    try {
      const res = await fetch(`/api/shopping/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchShoppingItems();
        toast.success('Item removed');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleClearPurchased = async () => {
    try {
      const res = await fetch('/api/shopping/clear', { method: 'POST' });
      if (res.ok) {
        fetchShoppingItems();
        toast.success('Purchased items cleared');
      }
    } catch {
      toast.error('Failed to clear');
    }
  };

  // Smart Grocery Prediction handlers
  const fetchGroceryPredictions = async () => {
    setGroceryLoading(true);
    try {
      const res = await fetch('/api/grocery');
      const data = await res.json();
      setGroceryItems(data?.items ?? []);
      setGrocerySuggestions(data?.suggestions ?? []);
    } catch {
      console.error('Failed to fetch grocery predictions');
    } finally {
      setGroceryLoading(false);
    }
  };

  const handleAddGroceryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroceryName.trim() || !newGroceryQuantity) return;
    
    const qty = parseFloat(newGroceryQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    setGroceryLoading(true);
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroceryName,
          quantity: qty,
          unit: newGroceryUnit
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewGroceryName('');
        setNewGroceryQuantity('');
        fetchGroceryPredictions();
        toast.success(data.message || 'Item added!');
      } else {
        toast.error(data.error || 'Failed to add item');
      }
    } catch {
      toast.error('Failed to add item');
    } finally {
      setGroceryLoading(false);
    }
  };

  const handleMarkGroceryFinished = async (id: string) => {
    try {
      const res = await fetch(`/api/grocery/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish' })
      });
      if (res.ok) {
        fetchGroceryPredictions();
        toast.success('Item marked as finished');
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDeleteGroceryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/grocery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchGroceryPredictions();
        toast.success('Item removed');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getUrgencyBgColor = (level: string) => {
    switch (level) {
      case 'green': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'yellow': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'red': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  // Chore handlers
  const fetchChores = async () => {
    setChoresLoading(true);
    try {
      const res = await fetch('/api/chores');
      const data = await res.json();
      setChores(data?.chores ?? []);
      setChoreAssignments(data?.currentAssignments ?? []);
    } catch {
      console.error('Failed to fetch chores');
    } finally {
      setChoresLoading(false);
    }
  };

  const handleCreateChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoreName.trim()) return;
    
    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChoreName,
          icon: newChoreIcon,
          frequency: newChoreFrequency
        })
      });
      if (res.ok) {
        setNewChoreName('');
        setNewChoreIcon('🧹');
        setNewChoreFrequency('weekly');
        setAddChoreOpen(false);
        fetchChores();
        toast.success('Chore added!');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create chore');
      }
    } catch {
      toast.error('Failed to create chore');
    }
  };

  const handleToggleChore = async (choreId: string) => {
    try {
      const res = await fetch(`/api/chores/${choreId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        fetchChores();
        toast.success('Chore updated');
      }
    } catch {
      toast.error('Failed to toggle chore');
    }
  };

  const handleDeleteChore = async (choreId: string) => {
    // Use toast confirmation instead of browser confirm() which can be blocked in iframes
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium">Delete this chore?</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch(`/api/chores/${choreId}`, { method: 'DELETE' });
                if (res.ok) {
                  fetchChores();
                  toast.success('Chore deleted');
                } else {
                  const data = await res.json();
                  toast.error(data.error || 'Failed to delete');
                }
              } catch {
                toast.error('Failed to delete chore');
              }
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const handleMarkChoreComplete = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/chores/assignments/${assignmentId}/complete`, { method: 'PATCH' });
      if (res.ok) {
        fetchChores();
        toast.success('Marked as done!');
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const formatChorePeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const fetchChatMessages = async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      setChatMessages(data?.messages ?? []);
    } catch {
      console.error('Failed to fetch chat');
    }
  };

  // House Voice functions
  const fetchHouseVoice = async () => {
    setHouseVoiceLoading(true);
    try {
      const res = await fetch('/api/house-voice');
      const data = await res.json();
      setHouseVoicePosts(data?.posts ?? []);
      setHouseSignals(data?.signals ?? []);
    } catch {
      console.error('Failed to fetch house voice');
    } finally {
      setHouseVoiceLoading(false);
    }
  };

  const handleSubmitSignal = async () => {
    if (!signalCategory) {
      toast.error('Please select a category');
      return;
    }

    setSignalSubmitting(true);
    try {
      const res = await fetch('/api/house-voice/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: signalCategory,
          message: signalMessage.trim() || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to submit signal');
        return;
      }

      toast.success('Signal submitted anonymously');
      setSignalCategory('');
      setSignalMessage('');
      setHouseVoiceOpen(false);
      fetchHouseVoice();
    } catch {
      toast.error('Failed to submit signal');
    } finally {
      setSignalSubmitting(false);
    }
  };

  const handleGenerateHouseUpdate = async (type: 'weekly_summary' | 'monthly_summary') => {
    try {
      const res = await fetch('/api/house-voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to generate update');
        return;
      }

      toast.success('House update generated');
      fetchHouseVoice();
    } catch {
      toast.error('Failed to generate update');
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = searchQuery === '' || 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.paidBy.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      const matchesMonth = expense.month === selectedMonth;
      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [expenses, searchQuery, categoryFilter, selectedMonth]);

  // Category totals for charts
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      const cat = expense.category || 'other';
      totals[cat] = (totals[cat] || 0) + expense.amountCents;
    });
    return Object.entries(totals).map(([id, amount]) => ({
      ...CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1],
      amount
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const totalMonthlySpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amountCents, 0);
  }, [filteredExpenses]);

  // Member spending breakdown
  const memberSpending = useMemo(() => {
    const spending: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      const payerId = expense.paidBy.id;
      spending[payerId] = (spending[payerId] || 0) + expense.amountCents;
    });
    return members.map(m => ({
      id: m.id,
      name: m.displayName,
      amount: spending[m.id] || 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, members]);

  // Fetch monthly trends when charts modal opens
  useEffect(() => {
    if (chartsOpen && monthlyTrends.length === 0) {
      // Calculate last 6 months of spending
      const trends: { month: string; amount: number }[] = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
        const monthExpenses = expenses.filter(e => e.month === monthStr);
        const total = monthExpenses.reduce((sum, e) => sum + e.amountCents, 0);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        trends.push({ month: monthLabel, amount: total / 100 });
      }
      setMonthlyTrends(trends);
    }
  }, [chartsOpen, expenses, monthlyTrends.length]);

  // Pie chart data
  const pieData = useMemo(() => {
    return categoryTotals.map(cat => ({
      name: cat.label,
      value: cat.amount / 100,
      color: cat.color.replace('bg-', '').replace('-500', ''),
    }));
  }, [categoryTotals]);

  const PIE_COLORS = ['#3b82f6', '#eab308', '#22c55e', '#a855f7', '#ec4899', '#f97316', '#ef4444', '#6b7280'];

  // Calculate debt breakdown between current user and another member
  const getDebtBreakdown = useCallback((otherMemberId: string) => {
    // Find expenses where the other member paid and current user owes
    const theyPaidYouOwe = expenses.filter(e => {
      if (e.paidBy.id !== otherMemberId) return false;
      const mySplit = e.splits.find(s => s.memberId === user.id);
      return mySplit && mySplit.shareCents > 0;
    }).map(e => ({
      id: e.id,
      description: e.description,
      category: e.category,
      totalAmount: e.amountCents, // Total expense amount
      amountOwed: e.splits.find(s => s.memberId === user.id)?.shareCents || 0, // Your share
      date: e.createdAt
    }));

    // Find expenses where current user paid and other member owes
    const youPaidTheyOwe = expenses.filter(e => {
      if (e.paidBy.id !== user.id) return false;
      const theirSplit = e.splits.find(s => s.memberId === otherMemberId);
      return theirSplit && theirSplit.shareCents > 0;
    }).map(e => ({
      id: e.id,
      description: e.description,
      category: e.category,
      totalAmount: e.amountCents, // Total expense amount
      amountOwed: e.splits.find(s => s.memberId === otherMemberId)?.shareCents || 0, // Their share
      date: e.createdAt
    }));

    // Find settlements between these two
    const settlementsFromMe = settlements.filter(s => 
      s.fromMember.id === user.id && s.toMember.id === otherMemberId
    );
    const settlementsToMe = settlements.filter(s => 
      s.fromMember.id === otherMemberId && s.toMember.id === user.id
    );

    const totalIOwe = theyPaidYouOwe.reduce((sum, e) => sum + e.amountOwed, 0);
    const totalTheyOwe = youPaidTheyOwe.reduce((sum, e) => sum + e.amountOwed, 0);
    const totalIPaid = settlementsFromMe.reduce((sum, s) => sum + s.amountCents, 0);
    const totalTheyPaid = settlementsToMe.reduce((sum, s) => sum + s.amountCents, 0);

    const netAmount = (totalIOwe - totalIPaid) - (totalTheyOwe - totalTheyPaid);

    return {
      theyPaidYouOwe,
      youPaidTheyOwe,
      settlementsFromMe,
      settlementsToMe,
      totalIOwe,
      totalTheyOwe,
      totalIPaid,
      totalTheyPaid,
      netAmount // positive = you owe them, negative = they owe you
    };
  }, [expenses, settlements, user.id]);

  const resetExpenseForm = () => {
    setDescription('');
    setAmount('');
    setPaidById(user.id || members[0]?.id || '');
    setCategory('other');
    setNotes('');
    setSplitType('equal');
    setCustomSplits({});
    setPercentSplits({});
    setBillFile(null);
  };

  // OCR Receipt Scanning - auto-fill form
  const handleScanReceipt = async (file: File) => {
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to scan receipt');
      }
      
      const result = await res.json();
      
      if (result.success && result.data) {
        if (result.data.amount) setAmount(result.data.amount.toFixed(2));
        if (result.data.description) setDescription(result.data.description);
        if (result.data.category) setCategory(result.data.category);
        setBillFile(file);
        
        const confidence = result.data.confidence;
        if (confidence === 'high') {
          toast.success('✨ Receipt scanned successfully!');
        } else if (confidence === 'medium') {
          toast.success('Receipt scanned! Please verify the details.');
        } else {
          toast.success('Receipt scanned. Low confidence - please check carefully.');
        }
      } else {
        throw new Error('Could not extract receipt information');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to scan receipt. Please enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  // Quick Scan - auto-create expense with equal split
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [quickScanResult, setQuickScanResult] = useState<{
    amount: number;
    description: string;
    category: string;
    confidence: string;
    fullText: string;
    file: File;
  } | null>(null);
  const [quickScanSubmitting, setQuickScanSubmitting] = useState(false);

  const handleQuickScan = async (file: File) => {
    setScanning(true);
    setQuickScanOpen(true);
    setQuickScanResult(null);
    
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to scan receipt');
      }
      
      const result = await res.json();
      
      if (result.success && result.data) {
        setQuickScanResult({
          amount: result.data.amount,
          description: result.data.description,
          category: result.data.category,
          confidence: result.data.confidence,
          fullText: result.data.fullText || '',
          file: file
        });
      } else {
        throw new Error('Could not extract receipt information');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to scan receipt');
      setQuickScanOpen(false);
    } finally {
      setScanning(false);
    }
  };

  const handleQuickScanConfirm = async () => {
    if (!quickScanResult) return;
    
    setQuickScanSubmitting(true);
    try {
      const amountCents = Math.round(quickScanResult.amount * 100);
      const splitCents = Math.floor(amountCents / members.length);
      const remainder = amountCents - (splitCents * members.length);
      
      // Create equal splits
      const splits = members.map((m, i) => ({
        memberId: m.id,
        shareCents: splitCents + (i === 0 ? remainder : 0)
      }));
      
      // Upload bill photo first if needed
      let billPhotoUrl = '';
      const uploadFormData = new FormData();
      uploadFormData.append('file', quickScanResult.file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });
      
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        billPhotoUrl = uploadData.url || '';
      }
      
      // Create expense with OCR text for searchability
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: quickScanResult.description,
          amountCents,
          paidById: user.id,
          month: currentMonth,
          category: quickScanResult.category,
          notes: '',
          billPhotoUrl,
          receiptOcrText: quickScanResult.fullText,
          splits
        })
      });
      
      if (!res.ok) throw new Error('Failed to create expense');
      
      toast.success(`✨ Expense added: ${quickScanResult.description} - €${quickScanResult.amount.toFixed(2)}`);
      setQuickScanOpen(false);
      setQuickScanResult(null);
      fetchData();
      refetchBalances();
      // Refresh archive if viewing
      if (archiveResults) {
        handleArchiveSearch();
      }
    } catch (error) {
      toast.error('Failed to add expense');
    } finally {
      setQuickScanSubmitting(false);
    }
  };

  // Handle undo
  const handleUndo = async () => {
    if (!undoAction) return;
    
    try {
      const res = await fetch('/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undoId: undoAction.id })
      });
      
      if (!res.ok) throw new Error();
      
      toast.success('Action undone!');
      setUndoAction(null);
      setUndoCountdown(0);
      fetchData();
      refetchBalances();
    } catch {
      toast.error('Failed to undo');
    }
  };

  // Quick settle - pre-fill settlement form
  const handleQuickSettle = (fromId: string, toId: string, amount: number) => {
    setSettleFromId(fromId);
    setSettleToId(toId);
    setSettleAmount((amount / 100).toFixed(2));
    setPaymentMethod('cash');
    setSettleUpOpen(true);
  };

  // Fetch smart settle suggestions (available to all users)
  const fetchSmartSettle = async () => {
    setLoadingSmartSettle(true);
    try {
      const res = await fetch('/api/smart-settle');
      const data = await res.json();
      setSmartSettleSuggestions(data?.suggestions ?? []);
    } catch {
      toast.error('Failed to load settlement suggestions');
    } finally {
      setLoadingSmartSettle(false);
    }
  };

  const openSmartSettle = () => {
    setSmartSettleOpen(true);
    fetchSmartSettle();
  };

  // Who Pays spinner - weighted random selection
  const handleSpinWheel = () => {
    if (isSpinning || members.length === 0) return;
    
    setIsSpinning(true);
    setSpinnerWinner(null);
    
    // Calculate weights based on balances
    const memberWeights = members.map(member => {
      const balance = balances.find(b => b.memberId === member.id);
      if (spinnerWeighted && balance) {
        // Person who owes more (negative balance) has higher chance
        // Use absolute value of negative balance as weight, minimum weight of 1
        const weight = balance.netBalance < 0 ? Math.abs(balance.netBalance) / 100 + 1 : 1;
        return { member, weight };
      }
      return { member, weight: 1 };
    });
    
    // Calculate total weight
    const totalWeight = memberWeights.reduce((sum, mw) => sum + mw.weight, 0);
    
    // Pick random winner based on weight
    let random = Math.random() * totalWeight;
    let winner = memberWeights[0].member;
    for (const mw of memberWeights) {
      random -= mw.weight;
      if (random <= 0) {
        winner = mw.member;
        break;
      }
    }
    
    // Calculate final rotation to land on winner
    const memberIndex = members.findIndex(m => m.id === winner.id);
    const segmentAngle = 360 / members.length;
    const targetAngle = 360 - (memberIndex * segmentAngle) - (segmentAngle / 2);
    const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const finalRotation = spinnerRotation + (spins * 360) + targetAngle + (Math.random() * 20 - 10);
    
    setSpinnerRotation(finalRotation);
    
    // Announce winner after spin
    setTimeout(() => {
      setSpinnerWinner(winner.displayName);
      setIsSpinning(false);
    }, 4000);
  };

  // Toggle push notifications
  const handleToggleNotifications = async () => {
    if (!notificationsSupported) {
      toast.error('Push notifications are not supported on this device');
      return;
    }

    setNotificationsLoading(true);
    try {
      if (notificationsEnabled) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
        }
        setNotificationsEnabled(false);
        toast.success('Notifications disabled');
      } else {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Notification permission denied');
          setNotificationsLoading(false);
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Subscribe to push
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          toast.error('Push notifications not configured');
          setNotificationsLoading(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        });

        // Send subscription to server
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });

        if (res.ok) {
          setNotificationsEnabled(true);
          toast.success('Notifications enabled! 🔔');
        } else {
          throw new Error('Failed to subscribe');
        }
      }
    } catch (error) {
      console.error('Notification toggle error:', error);
      toast.error('Failed to update notification settings');
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Toggle simplify debts (admin only)
  const handleToggleSimplifyDebts = async () => {
    if (!user.isAdmin) return;
    
    setSimplifyDebtsLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simplifyDebts: !simplifyDebts })
      });
      
      if (res.ok) {
        await refetchBalances();
        toast.success(simplifyDebts ? 'Simplify debts disabled' : 'Simplify debts enabled');
      } else {
        toast.error('Failed to update setting');
      }
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSimplifyDebtsLoading(false);
    }
  };

  // Profile edit functions
  const openProfileEdit = () => {
    const currentMember = members.find(m => m.id === user.id);
    setEditDisplayName(user.displayName);
    setEditAvatarUrl(currentMember?.avatarUrl || '');
    setAvatarUploadMethod('url');
    setProfileEditOpen(true);
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      // Get presigned URL for upload
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true
        })
      });

      if (!presignedRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // Check if Content-Disposition header is needed
      const signedHeaders = new URL(uploadUrl).searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment';
      }

      // Upload file directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }

      // Get the public URL
      const urlRes = await fetch(`/api/upload/presigned?cloud_storage_path=${encodeURIComponent(cloud_storage_path)}&isPublic=true`);
      if (!urlRes.ok) {
        throw new Error('Failed to get image URL');
      }
      
      const { url } = await urlRes.json();
      setEditAvatarUrl(url);
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) {
        avatarFileRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          avatarUrl: editAvatarUrl || null
        })
      });

      if (res.ok) {
        toast.success('Profile updated!');
        setProfileEditOpen(false);
        // Refresh the page to reflect changes
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Archive search
  const handleArchiveSearch = async (searchQuery?: string, categoryFilter?: string) => {
    setArchiveLoading(true);
    try {
      const params = new URLSearchParams();
      const query = searchQuery !== undefined ? searchQuery : archiveSearch;
      const cat = categoryFilter !== undefined ? categoryFilter : archiveCategory;
      
      if (query) params.append('q', query);
      if (cat && cat !== 'all') params.append('category', cat);
      
      const res = await fetch(`/api/expenses/search?${params.toString()}`);
      const data = await res.json();
      
      setArchiveResults(data);
    } catch (error) {
      toast.error('Failed to search');
    } finally {
      setArchiveLoading(false);
    }
  };

  // Fetch archive on tab switch
  useEffect(() => {
    if (activeTab === 'archive' && !archiveResults) {
      handleArchiveSearch('', 'all');
    }
  }, [activeTab]);

  // Send chat message
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    
    setChatLoading(true);
    try {
      // Extract mentions from message
      const mentionMatches = chatInput.match(/@(\w+)/g) || [];
      const mentions = mentionMatches
        .map(m => m.slice(1).toLowerCase())
        .map(name => members.find(member => member.displayName.toLowerCase().replace(/\s+/g, '') === name)?.id)
        .filter(Boolean) as string[];
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatInput, mentions })
      });
      
      if (!res.ok) throw new Error();
      
      const data = await res.json();
      setChatMessages(prev => [...prev, data.message]);
      setChatInput('');
      setShowMentionSuggestions(false);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  // Handle @ mention input
  const handleChatInputChange = (value: string) => {
    setChatInput(value);
    
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentionSuggestions(true);
      setMentionFilter('');
    } else if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentionSuggestions(true);
        setMentionFilter(afterAt.toLowerCase());
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Insert mention - replaces only the partial @mention being typed, preserves text after it
  const insertMention = (memberName: string) => {
    const lastAtIndex = chatInput.lastIndexOf('@');
    if (lastAtIndex === -1) {
      // No @ found, just append
      setChatInput(prev => prev + '@' + memberName.replace(/\s+/g, '') + ' ');
      setShowMentionSuggestions(false);
      return;
    }
    
    // Find where the partial mention ends (next space or end of string)
    const afterAt = chatInput.slice(lastAtIndex + 1);
    const spaceIndex = afterAt.indexOf(' ');
    
    // Text before the @
    const beforeMention = chatInput.slice(0, lastAtIndex);
    // Text after the partial mention (if any)
    const afterMention = spaceIndex !== -1 ? afterAt.slice(spaceIndex) : '';
    
    // Construct new value: [text before @] + @MentionName + [space] + [text after partial mention]
    const newValue = beforeMention + '@' + memberName.replace(/\s+/g, '') + ' ' + afterMention.trimStart();
    setChatInput(newValue);
    setShowMentionSuggestions(false);
  };

  // Handle notes with @mentions
  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !paidById) {
      toast.error('Please fill all fields');
      return;
    }

    const amountCents = parseCentsFromEuros(amount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    let splits: { memberId: string; shareCents: number }[] = [];

    if (splitType === 'equal') {
      const perPerson = Math.floor(amountCents / members.length);
      const remainder = amountCents - perPerson * members.length;
      splits = members.map((m, i) => ({
        memberId: m.id,
        shareCents: perPerson + (i < remainder ? 1 : 0)
      }));
    } else if (splitType === 'percentage') {
      let totalPercent = 0;
      for (const m of members) {
        totalPercent += parseFloat(percentSplits[m.id] || '0');
      }
      if (Math.abs(totalPercent - 100) > 0.01) {
        toast.error('Percentages must add up to 100%');
        return;
      }
      let assigned = 0;
      splits = members.map((m, i) => {
        const percent = parseFloat(percentSplits[m.id] || '0');
        let share = Math.round(amountCents * percent / 100);
        if (i === members.length - 1) {
          share = amountCents - assigned;
        }
        assigned += share;
        return { memberId: m.id, shareCents: share };
      });
    } else {
      let total = 0;
      for (const m of members) {
        const val = parseCentsFromEuros(customSplits[m.id] || '0');
        splits.push({ memberId: m.id, shareCents: val });
        total += val;
      }
      if (total !== amountCents) {
        toast.error(`Split total (€${(total/100).toFixed(2)}) must equal €${(amountCents/100).toFixed(2)}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      let billPhotoUrl: string | undefined;
      let billPhotoPath: string | undefined;

      if (billFile) {
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: billFile.name,
            contentType: billFile.type,
            isPublic: true
          })
        });
        const { uploadUrl, cloud_storage_path } = await presignedRes.json();
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': billFile.type, 'Content-Disposition': 'attachment' },
          body: billFile
        });
        const urlRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cloud_storage_path, getUrl: true, isPublic: true })
        });
        const urlData = await urlRes.json();
        billPhotoUrl = urlData.url;
        billPhotoPath = cloud_storage_path;
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amountCents,
          paidById,
          month: currentMonth,
          category,
          notes: notes || null,
          splits,
          billPhotoUrl,
          billPhotoPath
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success('Expense added!');
      setAddExpenseOpen(false);
      resetExpenseForm();
      fetchData();
      refetchBalances();
      
      // Refresh undo state
      const undoRes = await fetch('/api/undo');
      const undoData = await undoRes.json();
      if (undoData.undoAction) {
        setUndoAction(undoData.undoAction);
        setUndoCountdown(Math.max(0, Math.floor((new Date(undoData.undoAction.expiresAt).getTime() - Date.now()) / 1000)));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpense || !description.trim() || !amount || !paidById) {
      toast.error('Please fill all fields');
      return;
    }

    const amountCents = parseCentsFromEuros(amount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    let splits: { memberId: string; shareCents: number }[] = [];

    if (splitType === 'equal') {
      const perPerson = Math.floor(amountCents / members.length);
      const remainder = amountCents - perPerson * members.length;
      splits = members.map((m, i) => ({
        memberId: m.id,
        shareCents: perPerson + (i < remainder ? 1 : 0)
      }));
    } else if (splitType === 'percentage') {
      let totalPercent = 0;
      for (const m of members) {
        totalPercent += parseFloat(percentSplits[m.id] || '0');
      }
      if (Math.abs(totalPercent - 100) > 0.01) {
        toast.error('Percentages must add up to 100%');
        return;
      }
      let assigned = 0;
      splits = members.map((m, i) => {
        const percent = parseFloat(percentSplits[m.id] || '0');
        let share = Math.round(amountCents * percent / 100);
        if (i === members.length - 1) {
          share = amountCents - assigned;
        }
        assigned += share;
        return { memberId: m.id, shareCents: share };
      });
    } else {
      let total = 0;
      for (const m of members) {
        const val = parseCentsFromEuros(customSplits[m.id] || '0');
        splits.push({ memberId: m.id, shareCents: val });
        total += val;
      }
      if (total !== amountCents) {
        toast.error(`Split total must equal €${(amountCents/100).toFixed(2)}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${editExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amountCents, paidById, category, notes: notes || null, splits })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success('Expense updated!');
      setEditExpense(null);
      resetExpenseForm();
      fetchData();
      refetchBalances();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      toast.success('Expense deleted');
      fetchData();
      refetchBalances();
      
      // Refresh undo state
      const undoRes = await fetch('/api/undo');
      const undoData = await undoRes.json();
      if (undoData.undoAction) {
        setUndoAction(undoData.undoAction);
        setUndoCountdown(Math.max(0, Math.floor((new Date(undoData.undoAction.expiresAt).getTime() - Date.now()) / 1000)));
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openEditExpenseModal = (expense: Expense) => {
    setDescription(expense.description);
    setAmount((expense.amountCents / 100).toFixed(2));
    setPaidById(expense.paidBy.id);
    setCategory(expense.category || 'other');
    setNotes(expense.notes || '');
    
    const isEqual = expense.splits.every((s, _, arr) => 
      Math.abs(s.shareCents - arr[0].shareCents) <= 1
    );
    if (isEqual) {
      setSplitType('equal');
    } else {
      setSplitType('custom');
      const splits: Record<string, string> = {};
      expense.splits.forEach(s => {
        splits[s.memberId] = (s.shareCents / 100).toFixed(2);
      });
      setCustomSplits(splits);
    }
    setEditExpense(expense);
  };

  const handleSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleFromId || !settleToId || !settleAmount) {
      toast.error('Please fill all fields');
      return;
    }

    const amountCents = parseCentsFromEuros(settleAmount);
    if (amountCents <= 0) {
      toast.error('Amount must be positive');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId: settleFromId,
          toMemberId: settleToId,
          amountCents,
          month: currentMonth,
          paymentMethod
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success('Settlement recorded!');
      setSettleUpOpen(false);
      setSettleFromId('');
      setSettleToId('');
      setSettleAmount('');
      setPaymentMethod('cash');
      fetchData();
      refetchBalances();
      
      // Refresh undo state
      const undoRes = await fetch('/api/undo');
      const undoData = await undoRes.json();
      if (undoData.undoAction) {
        setUndoAction(undoData.undoAction);
        setUndoCountdown(Math.max(0, Math.floor((new Date(undoData.undoAction.expiresAt).getTime() - Date.now()) / 1000)));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!confirm('Delete this settlement?')) return;
    try {
      await fetch(`/api/settlements/${id}`, { method: 'DELETE' });
      toast.success('Settlement deleted');
      fetchData();
      refetchBalances();
      
      // Refresh undo state
      const undoRes = await fetch('/api/undo');
      const undoData = await undoRes.json();
      if (undoData.undoAction) {
        setUndoAction(undoData.undoAction);
        setUndoCountdown(Math.max(0, Math.floor((new Date(undoData.undoAction.expiresAt).getTime() - Date.now()) / 1000)));
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitCents = parseCentsFromEuros(budgetLimit);
    if (limitCents <= 0) {
      toast.error('Budget must be positive');
      return;
    }

    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyLimit: limitCents, alertAt: parseInt(budgetAlertAt) || 80 })
      });
      if (!res.ok) throw new Error();
      toast.success('Budget saved!');
      setBudgetModalOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to save budget');
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/export/csv?month=${selectedMonth}`;
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf-export' });
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${selectedMonth}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!', { id: 'pdf-export' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export PDF';
      toast.error(errorMessage, { id: 'pdf-export' });
    }
  };

  // Calculate total balance for user
  const userBalance = balances.find(b => b.memberId === user.id);
  const totalOwed = userBalance?.netBalance ?? 0;

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const changeMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-5 h-5" /> },
    { id: 'balances', label: 'Balances', icon: <Users className="w-5 h-5" /> },
    { id: 'cleaning', label: 'Cleaning', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
    { id: 'account', label: 'Account', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Top Header */}
      <header className="bg-[#5bc5a7] dark:bg-[#3d9b82] text-white sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <span className="font-bold text-lg">RoomSplit</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Group Chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setActiveTab('housevoice');
                fetchHouseVoice();
              }}
              className="p-2 rounded-full hover:bg-white/20 transition-colors relative"
              title="House Voice"
            >
              <Radio className="w-5 h-5" />
              {houseSignals.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {houseSignals.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShoppingListOpen(true)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors relative"
              title="Shopping List"
            >
              <ShoppingCart className="w-5 h-5" />
              {shoppingItems.filter(i => !i.purchased).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {shoppingItems.filter(i => !i.purchased).length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setGroceryPredictionOpen(true);
                fetchGroceryPredictions();
              }}
              className="p-2 rounded-full hover:bg-white/20 transition-colors relative"
              title="Smart Grocery Tracker"
            >
              <TrendingUp className="w-5 h-5" />
              {grocerySuggestions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {grocerySuggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setChartsOpen(true)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              title="View Charts"
            >
              <PieChart className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Undo Banner */}
      <AnimatePresence>
        {undoAction && undoCountdown > 0 && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {undoAction.isOwn !== false ? (
                <Undo2 className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm">
                {undoAction.isOwn !== false ? (
                  <>
                    {undoAction.actionType.includes('added') ? 'Added' : 'Deleted'} {undoAction.entityType}
                    <span className="text-gray-400 ml-1">({undoCountdown}s)</span>
                  </>
                ) : (
                  <>
                    Added by {undoAction.creatorName}
                    <span className="text-gray-400 ml-1">· Locked</span>
                  </>
                )}
              </span>
            </div>
            {undoAction.isOwn !== false ? (
              <button
                onClick={handleUndo}
                className="px-3 py-1 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                Undo
              </button>
            ) : (
              <span className="text-xs text-gray-400">Only {undoAction.creatorName} can undo</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shopping List Banner */}
      {shoppingItems.filter(i => !i.purchased).length > 0 && (
        <button
          onClick={() => setShoppingListOpen(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between hover:from-orange-600 hover:to-amber-600 transition-all"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-medium">
              {shoppingItems.filter(i => !i.purchased).length} item{shoppingItems.filter(i => !i.purchased).length !== 1 ? 's' : ''} needed
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-white/80">
            <span>Tap to view</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* Budget Alert */}
      {budgetInfo && (budgetInfo.isOverBudget || budgetInfo.isNearLimit) && activeTab === 'expenses' && (
        <div className={`px-4 py-2 text-center text-sm font-medium ${budgetInfo.isOverBudget ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}>
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {budgetInfo.isOverBudget 
            ? `Over budget! Spent ${formatCents(budgetInfo.currentSpent)} of ${formatCents(budget?.monthlyLimit || 0)}`
            : `${budgetInfo.percentUsed}% of budget used`
          }
        </div>
      )}

      {/* Balance Summary Header */}
      {activeTab === 'expenses' && (
        <div className="bg-[#5bc5a7] dark:bg-[#3d9b82] text-white pb-6 pt-2">
          <div className="max-w-lg mx-auto px-4 text-center">
            {totalOwed === 0 ? (
              <div>
                <p className="text-white/80 text-sm">You're all settled up!</p>
                <p className="text-2xl font-bold mt-1">€0.00</p>
              </div>
            ) : totalOwed > 0 ? (
              <div>
                <p className="text-white/80 text-sm">You are owed</p>
                <p className="text-3xl font-bold mt-1 text-white">{formatCents(totalOwed)}</p>
              </div>
            ) : (
              <div>
                <p className="text-white/80 text-sm">You owe</p>
                <p className="text-3xl font-bold mt-1 text-orange-200">{formatCents(Math.abs(totalOwed))}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month Selector & Filters */}
      {activeTab === 'expenses' && (
        <div className="max-w-lg mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-[var(--muted)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-[var(--foreground)]">{formatMonth(selectedMonth)}</span>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-[var(--muted)]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[#5bc5a7]"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border ${showFilters ? 'bg-[#5bc5a7] text-white border-[#5bc5a7]' : 'bg-[var(--card)] border-[var(--border)]'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]"
              title="Export CSV"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2"
            >
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === 'all' ? 'bg-[#5bc5a7] text-white' : 'bg-[var(--muted)] text-[var(--foreground)]'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    categoryFilter === cat.id ? `${cat.color} text-white` : 'bg-[var(--muted)] text-[var(--foreground)]'
                  }`}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {loading ? (
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-2 border-[#5bc5a7] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                    <Receipt className="w-10 h-10 text-[var(--muted-foreground)]" />
                  </div>
                  <p className="text-[var(--muted-foreground)]">No expenses found</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">Tap + to add one</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {filteredExpenses.map((expense) => {
                    const userSplit = expense.splits.find(s => s.memberId === user.id);
                    const isPayee = expense.paidBy.id === user.id;
                    const netAmount = isPayee 
                      ? expense.amountCents - (userSplit?.shareCents || 0)
                      : -(userSplit?.shareCents || 0);

                    return (
                      <div
                        key={expense.id}
                        className="flex items-center gap-3 px-4 py-3 bg-[var(--card)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <CategoryIcon category={expense.category} />
                        
                        <div className="flex-1 min-w-0" onClick={() => setSplitHistoryExpense(expense)}>
                          <div className="flex items-center gap-2 cursor-pointer">
                            <p className="font-medium text-[var(--foreground)] truncate">{expense.description}</p>
                            {expense.isRecurring && (
                              <RefreshCw className="w-3 h-3 text-[var(--muted-foreground)]" />
                            )}
                            {expense.billPhotoUrl && (
                              <Camera className="w-3 h-3 text-[var(--muted-foreground)]" />
                            )}
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {expense.paidBy.displayName} paid {formatCents(expense.amountCents)}
                          </p>
                          {expense.notes && (
                            <p className="text-xs text-[var(--muted-foreground)] italic truncate mt-0.5">
                              <RenderWithMentions text={expense.notes} members={members} />
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          {isPayee && netAmount > 0 ? (
                            <p className="text-sm font-semibold text-[#5bc5a7]">you lent {formatCents(netAmount)}</p>
                          ) : !isPayee && netAmount < 0 ? (
                            <p className="text-sm font-semibold text-[#ff652f]">you borrowed {formatCents(Math.abs(netAmount))}</p>
                          ) : (
                            <p className="text-sm text-[var(--muted-foreground)]">not involved</p>
                          )}
                        </div>

                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSplitHistoryExpense(expense)}
                            className="p-1.5 rounded hover:bg-[var(--muted)]"
                            title="View Split"
                          >
                            <Eye className="w-4 h-4 text-[var(--muted-foreground)]" />
                          </button>
                          {expense.billPhotoUrl && (
                            <button
                              onClick={() => setImageViewerUrl(expense.billPhotoUrl!)}
                              className="p-1.5 rounded hover:bg-[var(--muted)]"
                            >
                              <Camera className="w-4 h-4 text-[var(--muted-foreground)]" />
                            </button>
                          )}
                          {!expense.isRecurring && (
                            <>
                              <button
                                onClick={() => openEditExpenseModal(expense)}
                                className="p-1.5 rounded hover:bg-[var(--muted)]"
                              >
                                <Pencil className="w-4 h-4 text-[var(--muted-foreground)]" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Monthly Total */}
              {filteredExpenses.length > 0 && (
                <div className="px-4 py-3 bg-[var(--muted)] border-t border-[var(--border)]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[var(--foreground)]">{formatMonth(selectedMonth)} Total</span>
                    <span className="font-bold text-[var(--foreground)]">{formatCents(totalMonthlySpent)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Balances Tab */}
          {activeTab === 'balances' && (
            <motion.div
              key="balances"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4 space-y-4"
            >
              {/* Your Balance Card */}
              <div className={`p-4 rounded-xl ${totalOwed >= 0 ? 'bg-gradient-to-br from-[#5bc5a7] to-[#3d9b82]' : 'bg-gradient-to-br from-[#ff652f] to-[#d14d1f]'} text-white`}>
                <div className="flex items-center gap-3">
                  <Avatar name={user.displayName} avatarUrl={members.find(m => m.id === user.id)?.avatarUrl} size="lg" />
                  <div className="flex-1">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-white/80 text-sm">Your balance</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {totalOwed > 0 ? <TrendingUp className="w-5 h-5" /> : totalOwed < 0 ? <TrendingDown className="w-5 h-5" /> : null}
                      <span className="text-2xl font-bold">{formatCents(Math.abs(totalOwed))}</span>
                    </div>
                    <p className="text-white/80 text-sm">
                      {totalOwed > 0 ? 'owed to you' : totalOwed < 0 ? 'you owe' : 'settled'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Simplified Debts View (when enabled) */}
              {simplifyDebts && simplifiedDebts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="font-semibold text-[var(--foreground)]">Simplified Payments</h3>
                    <span className="text-xs px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full">
                      {simplifiedDebts.length} transaction{simplifiedDebts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {simplifiedDebts.map((debt, idx) => {
                    const isYouPaying = debt.fromId === user.id;
                    const isYouReceiving = debt.toId === user.id;
                    const fromMember = members.find(m => m.id === debt.fromId);
                    const toMember = members.find(m => m.id === debt.toId);
                    
                    return (
                      <div key={idx} className={`p-3 rounded-xl border ${isYouPaying || isYouReceiving ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20' : 'border-[var(--border)] bg-[var(--card)]'}`}>
                        <div className="flex items-center gap-3">
                          <Avatar name={debt.fromName} avatarUrl={fromMember?.avatarUrl} size="sm" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isYouPaying ? 'text-violet-600 dark:text-violet-400' : 'text-[var(--foreground)]'}`}>
                                {isYouPaying ? 'You' : debt.fromName}
                              </span>
                              <svg className="w-4 h-4 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                              <span className={`font-medium ${isYouReceiving ? 'text-violet-600 dark:text-violet-400' : 'text-[var(--foreground)]'}`}>
                                {isYouReceiving ? 'You' : debt.toName}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--muted-foreground)]">
                              {isYouPaying ? 'You pay' : isYouReceiving ? 'You receive' : 'owes'}
                            </p>
                          </div>
                          <div className={`font-bold text-lg ${isYouPaying ? 'text-[#ff652f]' : isYouReceiving ? 'text-[#5bc5a7]' : 'text-[var(--foreground)]'}`}>
                            {formatCents(debt.amountCents)}
                          </div>
                          {isYouPaying && (
                            <button
                              onClick={() => handleQuickSettle(debt.fromId, debt.toId, debt.amountCents)}
                              className="px-3 py-1.5 bg-violet-500 text-white text-sm rounded-lg hover:bg-violet-600"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* All Settled Message (when simplifyDebts enabled) */}
              {simplifyDebts && simplifiedDebts.length === 0 && balances.every(b => b.netBalance === 0) && (
                <div className="p-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-bold text-lg">All Settled!</p>
                  <p className="text-white/80 text-sm">Everyone is squared up</p>
                </div>
              )}

              {/* Other Members with Quick Settle (when simplifyDebts is OFF) */}
              {!simplifyDebts && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--foreground)] px-1">Group Members</h3>
                  <p className="text-xs text-[var(--muted-foreground)] px-1 -mt-1">Tap a member to see why you owe/are owed</p>
                  {balances.filter(b => b.memberId !== user.id).map((balance) => {
                    // Calculate PAIRWISE balance between current user and this member
                    const pairwiseBreakdown = getDebtBreakdown(balance.memberId);
                    const pairwiseBalance = pairwiseBreakdown.netAmount; // positive = you owe them, negative = they owe you
                    const memberData = members.find(m => m.id === balance.memberId);
                    // You should pay if you owe them (pairwiseBalance > 0)
                    const userOwesThis = pairwiseBalance > 0;
                    
                    return (
                      <div 
                        key={balance.memberId} 
                        className="flex items-center gap-3 p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                        onClick={() => setDebtBreakdownMember({ id: balance.memberId, name: balance.displayName })}
                      >
                        <Avatar name={balance.displayName} avatarUrl={memberData?.avatarUrl} />
                        <div className="flex-1">
                          <p className="font-medium text-[var(--foreground)]">{balance.displayName}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">Tap to see details</p>
                        </div>
                        <div className={`font-semibold ${pairwiseBalance < 0 ? 'text-[#5bc5a7]' : pairwiseBalance > 0 ? 'text-[#ff652f]' : 'text-[var(--muted-foreground)]'}`}>
                          {pairwiseBalance > 0 ? `€-${(pairwiseBalance / 100).toFixed(2)}` : pairwiseBalance < 0 ? `€+${(Math.abs(pairwiseBalance) / 100).toFixed(2)}` : '€0.00'}
                        </div>
                        {/* Quick Settle Button */}
                        {userOwesThis && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickSettle(user.id, balance.memberId, pairwiseBalance);
                            }}
                            className="px-2 py-1 bg-[#5bc5a7] text-white text-xs rounded-lg hover:bg-[#4aa88d]"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Smart Settle Button - visible to ALL users */}
              {!balances.every(b => Math.abs(b.netBalance) < 1) && (
                <button
                  onClick={openSmartSettle}
                  className="w-full p-4 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl text-white flex items-center justify-center gap-3 hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg"
                >
                  <Sparkles className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-bold text-lg">Smart Settle</p>
                    <p className="text-sm text-white/80">See optimal payment plan</p>
                  </div>
                </button>
              )}

              {/* Who Pays? Fun Button */}
              <button
                onClick={() => {
                  setSpinnerWinner(null);
                  setSpinnerOpen(true);
                }}
                className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white flex items-center justify-center gap-3 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
              >
                <Dices className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-bold text-lg">Who Pays?</p>
                  <p className="text-sm text-white/80">Spin the wheel to decide!</p>
                </div>
              </button>

              {/* Settle Up Button - for users who owe */}
              {totalOwed < 0 && (
                <Button
                  onClick={() => setSettleUpOpen(true)}
                  className="w-full bg-[#5bc5a7] hover:bg-[#4aa88d] text-white"
                >
                  Settle Up
                </Button>
              )}

              {/* Recent Settlements */}
              {settlements.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--foreground)] px-1">Recent Settlements</h3>
                  {settlements.slice(0, 5).map((settlement) => {
                    const method = PAYMENT_METHODS.find(m => m.id === settlement.paymentMethod) || PAYMENT_METHODS[0];
                    const MethodIcon = method.icon;
                    return (
                      <div key={settlement.id} className="flex items-center gap-3 p-3 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MethodIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {settlement.fromMember.displayName} → {settlement.toMember.displayName}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {method.label} • {formatRelativeTime(settlement.createdAt)}
                          </p>
                        </div>
                        <span className="font-semibold text-[#5bc5a7]">{formatCents(settlement.amountCents)}</span>
                        <button
                          onClick={() => handleDeleteSettlement(settlement.id)}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Cleaning Tab */}
          {activeTab === 'cleaning' && (
            <motion.div
              key="cleaning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4 space-y-4"
            >
              {choresLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5bc5a7]" />
                </div>
              ) : (
                <>
                  {/* Your Chores This Period */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#5bc5a7]" />
                      Your Chores This Period
                    </h3>
                    {choreAssignments.filter(ca => ca.assignment?.assignedTo.id === user?.id).length === 0 ? (
                      <div className="text-center py-8 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                        <CheckCircle className="w-10 h-10 text-[#5bc5a7] mx-auto mb-2" />
                        <p className="text-[var(--muted-foreground)]">No chores assigned to you this period!</p>
                      </div>
                    ) : (
                      choreAssignments
                        .filter(ca => ca.assignment?.assignedTo.id === user?.id)
                        .map(({ chore, assignment }) => (
                          <div 
                            key={chore.id} 
                            className={`p-4 rounded-xl border ${assignment?.completedAt ? 'bg-[#5bc5a7]/10 border-[#5bc5a7]' : 'bg-[var(--card)] border-[var(--border)]'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{chore.icon}</span>
                                <div>
                                  <p className={`font-medium ${assignment?.completedAt ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
                                    {chore.name}
                                  </p>
                                  <p className="text-xs text-[var(--muted-foreground)]">
                                    {chore.frequency === 'biweekly' ? 'Every 2 weeks' : 'Weekly'}
                                  </p>
                                </div>
                              </div>
                              {assignment && (
                                <button
                                  onClick={() => handleMarkChoreComplete(assignment.id)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    assignment.completedAt
                                      ? 'bg-[#5bc5a7] text-white'
                                      : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[#5bc5a7] hover:text-white'
                                  }`}
                                >
                                  {assignment.completedAt ? (
                                    <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Done</span>
                                  ) : (
                                    'Mark Done'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* This Week's Schedule - read-only for everyone */}
                  <div className="space-y-3 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                        This Week's Schedule
                      </h3>
                      {choreAssignments.length > 0 && choreAssignments[0].assignment && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {formatChorePeriod(choreAssignments[0].assignment.periodStart, choreAssignments[0].assignment.periodEnd)}
                        </span>
                      )}
                    </div>
                    
                    {choreAssignments.length === 0 ? (
                      <div className="text-center py-8 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                        <Sparkles className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-2" />
                        <p className="text-[var(--muted-foreground)]">No chores set up yet</p>
                        {user?.isAdmin && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">Add chores below to get started</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {choreAssignments.map(({ chore, assignment }) => (
                          <div 
                            key={chore.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${
                              assignment?.completedAt 
                                ? 'bg-[#5bc5a7]/5 border-[#5bc5a7]/30' 
                                : 'bg-[var(--card)] border-[var(--border)]'
                            }`}
                          >
                            <span className="text-xl">{chore.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${assignment?.completedAt ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}`}>
                                {chore.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {assignment?.assignedTo && (
                                <div className="flex items-center gap-2">
                                  {assignment.assignedTo.avatarUrl ? (
                                    <img 
                                      src={assignment.assignedTo.avatarUrl} 
                                      alt="" 
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs font-medium">
                                      {assignment.assignedTo.displayName.charAt(0)}
                                    </div>
                                  )}
                                  <span className={`text-sm ${assignment.assignedTo.id === user?.id ? 'font-semibold text-[#5bc5a7]' : 'text-[var(--muted-foreground)]'}`}>
                                    {assignment.assignedTo.id === user?.id ? 'You' : assignment.assignedTo.displayName}
                                  </span>
                                </div>
                              )}
                              {assignment?.completedAt && (
                                <Check className="w-5 h-5 text-[#5bc5a7]" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Admin Section: Manage Chores */}
                  {user?.isAdmin && (
                    <div className="space-y-3 mt-6 pt-6 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                          <Settings className="w-4 h-4 text-[var(--muted-foreground)]" />
                          Manage Chores
                          <span className="text-xs bg-violet-500/20 text-violet-500 px-2 py-0.5 rounded-full">Admin</span>
                        </h3>
                        <Button size="sm" onClick={() => setAddChoreOpen(true)}>
                          <Plus className="w-4 h-4 mr-1" /> Add Chore
                        </Button>
                      </div>
                      
                      {chores.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No chores created yet</p>
                      ) : (
                        <div className="space-y-2">
                          {chores.map((chore) => (
                            <div 
                              key={chore.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border ${
                                chore.active 
                                  ? 'bg-[var(--card)] border-[var(--border)]' 
                                  : 'bg-[var(--muted)]/50 border-[var(--border)] opacity-60'
                              }`}
                            >
                              <span className="text-xl">{chore.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[var(--foreground)] truncate">{chore.name}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {chore.frequency === 'biweekly' ? 'Every 2 weeks' : 'Weekly'}
                                  {!chore.active && ' · Paused'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleChore(chore.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    chore.active 
                                      ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600' 
                                      : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600'
                                  }`}
                                  title={chore.active ? 'Pause' : 'Resume'}
                                >
                                  {chore.active ? <Archive className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteChore(chore.id)}
                                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[calc(100vh-180px)]"
            >
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                      <MessageCircle className="w-10 h-10 text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-[var(--muted-foreground)]">No messages yet</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isOwn = msg.member.id === user.id;
                    const memberData = members.find(m => m.id === msg.member.id);
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <Avatar name={msg.member.displayName} avatarUrl={memberData?.avatarUrl} size="sm" />
                          <div>
                            {!isOwn && (
                              <p className="text-xs text-[var(--muted-foreground)] mb-1">{msg.member.displayName}</p>
                            )}
                            <div className={`px-3 py-2 rounded-2xl ${isOwn ? 'bg-[#5bc5a7] text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'}`}>
                              <p className="text-sm">
                                <RenderWithMentions text={msg.content} members={members} />
                              </p>
                            </div>
                            <p className={`text-xs text-[var(--muted-foreground)] mt-1 ${isOwn ? 'text-right' : ''}`}>
                              {formatRelativeTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="px-4 py-3 bg-[var(--card)] border-t border-[var(--border)] relative">
                {/* Mention Suggestions */}
                <AnimatePresence>
                  {showMentionSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-4 right-4 mb-2 bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-lg overflow-hidden"
                    >
                      {members
                        .filter(m => m.displayName.toLowerCase().includes(mentionFilter))
                        .map(m => (
                          <button
                            key={m.id}
                            onClick={() => insertMention(m.displayName)}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--muted)] text-left"
                          >
                            <Avatar name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                            <span className="text-sm text-[var(--foreground)]">{m.displayName}</span>
                          </button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => handleChatInputChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                      placeholder="Type a message... Use @ to mention"
                      className="w-full px-4 py-2 rounded-full bg-[var(--muted)] border-0 text-sm focus:outline-none focus:ring-2 focus:ring-[#5bc5a7]"
                    />
                    <button
                      onClick={() => {
                        setChatInput(prev => prev + '@');
                        setShowMentionSuggestions(true);
                        setMentionFilter('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[#5bc5a7]"
                    >
                      <AtSign className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2 bg-[#5bc5a7] text-white rounded-full hover:bg-[#4aa88d] disabled:opacity-50"
                  >
                    {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {activities.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                    <Activity className="w-10 h-10 text-[var(--muted-foreground)]" />
                  </div>
                  <p className="text-[var(--muted-foreground)]">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {activities.map((activity) => {
                    const meta = activity.metadata || {};
                    let icon = <Activity className="w-5 h-5" />;
                    let text = 'Activity';
                    let color = 'text-[var(--muted-foreground)]';

                    if (activity.type === 'expense_added') {
                      icon = <Receipt className="w-5 h-5" />;
                      text = `${meta.addedBy || 'Someone'} added "${meta.description}"`;
                      color = 'text-[#5bc5a7]';
                    } else if (activity.type === 'settlement_recorded') {
                      icon = <Check className="w-5 h-5" />;
                      text = `${meta.from} paid ${meta.to} ${formatCents(meta.amountCents || 0)}`;
                      color = 'text-blue-500';
                    } else if (activity.type === 'member_joined') {
                      icon = <Users className="w-5 h-5" />;
                      text = `${meta.displayName || 'Someone'} joined the group`;
                      color = 'text-purple-500';
                    } else if (activity.type === 'expense_edited') {
                      icon = <Pencil className="w-5 h-5" />;
                      text = `${meta.editedBy || 'Someone'} edited "${meta.description}"`;
                      color = 'text-amber-500';
                    } else if (activity.type === 'expense_deleted') {
                      icon = <Trash2 className="w-5 h-5" />;
                      text = `${meta.deletedBy || 'Someone'} deleted "${meta.description}"`;
                      color = 'text-red-500';
                    } else if (activity.type === 'expense_undone') {
                      icon = <Undo2 className="w-5 h-5" />;
                      text = `${meta.undoneBy || 'Someone'} undone "${meta.description}"`;
                      color = 'text-orange-500';
                    } else if (activity.type === 'expense_restored') {
                      icon = <RefreshCw className="w-5 h-5" />;
                      text = `${meta.restoredBy || 'Someone'} restored "${meta.description}"`;
                      color = 'text-green-500';
                    } else if (activity.type === 'settlement_undone') {
                      icon = <Undo2 className="w-5 h-5" />;
                      text = `${meta.undoneBy || 'Someone'} undone settlement`;
                      color = 'text-orange-500';
                    } else if (activity.type === 'settlement_restored') {
                      icon = <RefreshCw className="w-5 h-5" />;
                      text = `${meta.restoredBy || 'Someone'} restored settlement`;
                      color = 'text-green-500';
                    }

                    return (
                      <div key={activity.id} className="flex items-start gap-3 px-4 py-3 bg-[var(--card)]">
                        <div className={`w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center shrink-0 ${color}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--foreground)]">{text}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatRelativeTime(activity.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Archive Tab */}
          {activeTab === 'archive' && (
            <motion.div
              key="archive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4 space-y-4"
            >
              {/* Back Button */}
              <button
                onClick={() => setActiveTab('account')}
                className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Back to Account</span>
              </button>

              {/* Search Header */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Archive className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">Receipt Archive</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">Search receipts & transactions</p>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleArchiveSearch()}
                    placeholder="Search receipts, expenses, members..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex gap-2 mb-3">
                  <select
                    value={archiveCategory}
                    onChange={(e) => {
                      setArchiveCategory(e.target.value);
                      handleArchiveSearch(archiveSearch, e.target.value);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)]"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => handleArchiveSearch()}
                    className="px-4 py-2 bg-[#5bc5a7] text-white rounded-lg font-medium hover:bg-[#4aa88d] transition-colors"
                  >
                    Search
                  </button>
                </div>

                {/* View Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 bg-[var(--muted)] rounded-lg p-1">
                    <button
                      onClick={() => setArchiveViewMode('gallery')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        archiveViewMode === 'gallery' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setArchiveViewMode('list')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        archiveViewMode === 'list' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {archiveResults && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {archiveResults.totalReceipts} receipts • {archiveResults.totalExpenses} expenses
                    </p>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {archiveLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5bc5a7]" />
                </div>
              )}

              {/* Results */}
              {!archiveLoading && archiveResults && (
                <>
                  {/* Receipt Gallery */}
                  {archiveViewMode === 'gallery' && archiveResults.receipts.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        Receipts ({archiveResults.receipts.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {archiveResults.receipts.map((expense) => (
                          <button
                            key={expense.id}
                            onClick={() => setSelectedReceipt(expense)}
                            className="relative aspect-square rounded-xl overflow-hidden bg-[var(--muted)] border border-[var(--border)] hover:border-[#5bc5a7] transition-colors group"
                          >
                            <img
                              src={expense.billPhotoUrl || ''}
                              alt={expense.description}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-1 left-1 right-1">
                                <p className="text-white text-xs font-medium truncate">{expense.description}</p>
                                <p className="text-white/80 text-xs">{formatCents(expense.amountCents)}</p>
                              </div>
                            </div>
                            <div className="absolute top-1 right-1">
                              <CategoryIcon category={expense.category} size="sm" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expense List (for list view or when no receipts) */}
                  {(archiveViewMode === 'list' || archiveResults.receipts.length === 0) && archiveResults.expenses.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Transactions ({archiveResults.expenses.length})
                      </h4>
                      <div className="space-y-2">
                        {archiveResults.expenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center gap-3"
                          >
                            {expense.billPhotoUrl ? (
                              <button
                                onClick={() => setSelectedReceipt(expense)}
                                className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--muted)] flex-shrink-0"
                              >
                                <img
                                  src={expense.billPhotoUrl}
                                  alt={expense.description}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <CategoryIcon category={expense.category} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[var(--foreground)] truncate">{expense.description}</p>
                              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                                <span>{expense.paidBy.displayName}</span>
                                <span>•</span>
                                <span>{formatMonth(expense.month)}</span>
                                {expense.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{expense.notes}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[var(--foreground)]">{formatCents(expense.amountCents)}</p>
                              <span className={`text-xs capitalize ${CATEGORIES.find(c => c.id === expense.category)?.textColor || 'text-gray-500'}`}>
                                {expense.category}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Settlement Results */}
                  {archiveResults.settlements.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Settlements ({archiveResults.settlements.length})
                      </h4>
                      <div className="space-y-2">
                        {archiveResults.settlements.map((settlement) => (
                          <div
                            key={settlement.id}
                            className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center gap-3"
                          >
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <ArrowRight className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[var(--foreground)]">
                                {settlement.fromMember.displayName} → {settlement.toMember.displayName}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                                <span className="capitalize">{settlement.paymentMethod.replace('_', ' ')}</span>
                                <span>•</span>
                                <span>{formatMonth(settlement.month)}</span>
                              </div>
                            </div>
                            <p className="font-semibold text-green-500">{formatCents(settlement.amountCents)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {archiveResults.expenses.length === 0 && archiveResults.settlements.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                        <Search className="w-10 h-10 text-[var(--muted-foreground)]" />
                      </div>
                      <p className="text-[var(--foreground)] font-medium">No results found</p>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">Try a different search term or filter</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* House Voice Tab */}
          {activeTab === 'housevoice' && (
            <motion.div
              key="housevoice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4 space-y-4"
            >
              {/* Header */}
              <div className="text-center space-y-2 pb-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Radio className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">House Voice</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Anonymous signals & house updates
                </p>
              </div>

              {/* Submit Signal Button */}
              <button
                onClick={() => setHouseVoiceOpen(true)}
                className="w-full p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Mic className="w-5 h-5" />
                Submit Anonymous Signal
              </button>
              
              <p className="text-xs text-center text-[var(--muted-foreground)]">
                Your identity is never revealed. Max 2 signals per week.
              </p>

              {/* Admin: Generate Update */}
              {user.isAdmin && (
                <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
                  <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Admin: Generate House Update
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleGenerateHouseUpdate('weekly_summary')}
                      variant="outline"
                      className="flex-1 text-sm"
                    >
                      Weekly
                    </Button>
                    <Button
                      onClick={() => handleGenerateHouseUpdate('monthly_summary')}
                      variant="outline"
                      className="flex-1 text-sm"
                    >
                      Monthly
                    </Button>
                  </div>
                </div>
              )}

              {/* House Updates Section */}
              {houseVoicePosts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-500" />
                    House Updates
                  </h3>
                  {houseVoicePosts.slice(0, 5).map((post) => (
                    <div 
                      key={post.id}
                      className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                    >
                      <pre className="whitespace-pre-wrap text-sm text-[var(--foreground)] font-sans">
                        {post.content}
                      </pre>
                      <p className="text-xs text-[var(--muted-foreground)] mt-2">
                        {new Date(post.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Anonymous Signals Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  House Signals
                  <span className="text-xs text-[var(--muted-foreground)] font-normal">
                    (Anonymous)
                  </span>
                </h3>

                {houseVoiceLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--muted-foreground)]" />
                  </div>
                ) : houseSignals.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[var(--muted)] flex items-center justify-center mb-3">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="font-medium text-[var(--foreground)]">All Clear!</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      No active house signals right now
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {houseSignals.map((signal) => (
                      <div 
                        key={signal.id}
                        className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{signal.categoryIcon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--foreground)]">
                              {signal.categoryLabel}
                            </p>
                            {signal.message && (
                              <p className="text-sm text-[var(--muted-foreground)] mt-1 italic">
                                "{signal.message}"
                              </p>
                            )}
                            <p className="text-xs text-[var(--muted-foreground)] mt-2">
                              {signal.timeAgo}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">About House Voice</p>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                      <li>• Signals are completely anonymous</li>
                      <li>• No names, no blame, no replies</li>
                      <li>• Use neutral language only</li>
                      <li>• Signals expire after 30 days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4 space-y-4"
            >
              {/* Profile Card */}
              <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center gap-4">
                <Avatar name={user.displayName} avatarUrl={members.find(m => m.id === user.id)?.avatarUrl} size="lg" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--foreground)]">{user.displayName}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{user.isAdmin ? '👑 Admin' : 'Member'}</p>
                </div>
                <button
                  onClick={openProfileEdit}
                  className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  title="Edit Profile"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>

              {/* Recurring Expenses Link */}
              <button
                onClick={() => setActiveTab('recurring')}
                className="w-full p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center gap-3 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-[var(--foreground)]">Recurring Expenses</p>
                  <p className="text-sm text-[var(--muted-foreground)]">Manage monthly bills</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
              </button>

              {/* Receipt Archive Link */}
              <button
                onClick={() => setActiveTab('archive')}
                className="w-full p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center gap-3 hover:bg-[var(--muted)] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Archive className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-[var(--foreground)]">Receipt Archive</p>
                  <p className="text-sm text-[var(--muted-foreground)]">Browse all receipts & expenses</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
              </button>

              {/* Push Notifications Toggle */}
              <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notificationsEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {notificationsEnabled ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">Push Notifications</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {notificationsSupported 
                      ? (notificationsEnabled ? 'You\'ll be notified of new expenses' : 'Get alerts when expenses are added')
                      : 'Not supported on this device'}
                  </p>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  disabled={!notificationsSupported || notificationsLoading}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    notificationsEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  } ${(!notificationsSupported || notificationsLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {notificationsLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                      notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} style={{ marginTop: '2px' }} />
                  )}
                </button>
              </div>

              {/* Simplify Debts Toggle (Admin only) */}
              {user.isAdmin && (
                <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${simplifyDebts ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <svg className={`w-5 h-5 ${simplifyDebts ? 'text-violet-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--foreground)]">Simplify Debts</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {simplifyDebts ? 'Minimizing transactions between members' : 'Show minimal payments to settle up'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleSimplifyDebts}
                    disabled={simplifyDebtsLoading}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      simplifyDebts ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                    } ${simplifyDebtsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {simplifyDebtsLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      </div>
                    ) : (
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        simplifyDebts ? 'translate-x-6' : 'translate-x-0.5'
                      }`} style={{ marginTop: '2px' }} />
                    )}
                  </button>
                </div>
              )}

              {/* Budget Settings (Admin only) */}
              {user.isAdmin && (
                <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[var(--foreground)]">Monthly Budget</h3>
                    <button
                      onClick={() => {
                        setBudgetLimit(budget ? (budget.monthlyLimit / 100).toFixed(2) : '');
                        setBudgetAlertAt(budget?.alertAt?.toString() || '80');
                        setBudgetModalOpen(true);
                      }}
                      className="text-[#5bc5a7] text-sm font-medium"
                    >
                      {budget ? 'Edit' : 'Set'}
                    </button>
                  </div>
                  {budget ? (
                    <div>
                      <p className="text-2xl font-bold text-[var(--foreground)]">{formatCents(budget.monthlyLimit)}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Alert at {budget.alertAt}%</p>
                      {budgetInfo && (
                        <div className="mt-2">
                          <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${budgetInfo.isOverBudget ? 'bg-red-500' : budgetInfo.isNearLimit ? 'bg-yellow-500' : 'bg-[#5bc5a7]'}`}
                              style={{ width: `${Math.min(budgetInfo.percentUsed, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {formatCents(budgetInfo.currentSpent)} spent ({budgetInfo.percentUsed}%)
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[var(--muted-foreground)] text-sm">No budget set</p>
                  )}
                </div>
              )}

              {/* Export Options */}
              <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
                <h3 className="font-semibold text-[var(--foreground)]">Export Data</h3>
                <div className="flex gap-2">
                  <Button onClick={handleExportCSV} variant="outline" className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button onClick={handleExportPDF} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Admin: Manage Members */}
              {user.isAdmin && <AdminMembersManager onMemberUpdate={() => { fetchData(); refetchBalances(); }} />}

              {/* Admin: Invite Codes */}
              {user.isAdmin && <AdminInviteCodes />}

              {/* Logout */}
              <Button onClick={onLogout} variant="destructive" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          )}

          {/* Recurring Tab (hidden from nav, accessed from account) */}
          {activeTab === 'recurring' && (
            <motion.div
              key="recurring"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-4"
            >
              <button
                onClick={() => setActiveTab('account')}
                className="flex items-center gap-2 text-[var(--muted-foreground)] mb-4 hover:text-[var(--foreground)]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Back to Account</span>
              </button>
              <RecurringSection isAdmin={user.isAdmin} onRefresh={fetchData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FAB - Quick Scan & Add */}
      {activeTab === 'expenses' && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-30">
          {/* Quick Scan Button */}
          <label className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:from-violet-600 hover:to-purple-700 transition-all">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleQuickScan(file);
              }}
            />
            {scanning ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <Camera className="w-7 h-7" />
            )}
          </label>
          
          {/* Add Expense Button */}
          <button
            onClick={() => {
              resetExpenseForm();
              setAddExpenseOpen(true);
            }}
            className="w-14 h-14 bg-[#5bc5a7] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#4aa88d] transition-colors"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors ${
                activeTab === tab.id || (activeTab === 'recurring' && tab.id === 'account') ? 'text-[#5bc5a7]' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Add Expense Modal */}
      <Dialog open={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          {/* Receipt Scanner */}
          <div className="p-3 bg-[var(--muted)] rounded-lg border border-dashed border-[var(--border)]">
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBillFile(file);
                    handleScanReceipt(file);
                  }
                }}
              />
              {scanning ? (
                <>
                  <Loader2 className="w-8 h-8 text-[#5bc5a7] animate-spin" />
                  <span className="text-sm text-[var(--muted-foreground)]">Scanning receipt...</span>
                </>
              ) : (
                <>
                  <Scan className="w-8 h-8 text-[#5bc5a7]" />
                  <span className="text-sm text-[var(--muted-foreground)]">Scan receipt to auto-fill</span>
                </>
              )}
            </label>
          </div>

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was it for?"
          />
          <Input
            label="Amount (€)"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          <Select
            label="Category"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
          />
          <Select
            label="Paid by"
            value={paidById}
            onChange={setPaidById}
            options={members.map(m => ({ value: m.id, label: m.displayName }))}
          />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1 block">Notes (use @name to mention)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes... @John for the party"
              className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[#5bc5a7]"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">Split Type</label>
            <div className="flex gap-2">
              {['equal', 'custom', 'percentage'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type as any)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                    splitType === type ? 'bg-[#5bc5a7] text-white' : 'bg-[var(--muted)] text-[var(--foreground)]'
                  }`}
                >
                  {type === 'percentage' && <Percent className="w-3 h-3" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {splitType === 'custom' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Custom Amounts</label>
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{m.displayName}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={customSplits[m.id] || ''}
                    onChange={(e) => setCustomSplits({ ...customSplits, [m.id]: e.target.value })}
                    placeholder="0.00"
                    className="w-24"
                  />
                </div>
              ))}
            </div>
          )}

          {splitType === 'percentage' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Percentage Split</label>
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{m.displayName}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="1"
                      value={percentSplits[m.id] || ''}
                      onChange={(e) => setPercentSplits({ ...percentSplits, [m.id]: e.target.value })}
                      placeholder="0"
                      className="w-20"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {billFile && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Camera className="w-4 h-4" />
              <span className="truncate">{billFile.name}</span>
              <button type="button" onClick={() => setBillFile(null)} className="text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <Button type="submit" loading={submitting} className="w-full bg-[#5bc5a7] hover:bg-[#4aa88d] text-white">
            Add Expense
          </Button>
        </form>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense">
        <form onSubmit={handleEditExpense} className="space-y-4">
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Amount (€)"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select
            label="Category"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
          />
          <Select
            label="Paid by"
            value={paidById}
            onChange={setPaidById}
            options={members.map(m => ({ value: m.id, label: m.displayName }))}
          />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-1 block">Notes (use @name to mention)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes... @John for the party"
              className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[#5bc5a7]"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">Split Type</label>
            <div className="flex gap-2">
              {['equal', 'custom', 'percentage'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type as any)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    splitType === type ? 'bg-[#5bc5a7] text-white' : 'bg-[var(--muted)] text-[var(--foreground)]'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {splitType === 'custom' && (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{m.displayName}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={customSplits[m.id] || ''}
                    onChange={(e) => setCustomSplits({ ...customSplits, [m.id]: e.target.value })}
                    className="w-24"
                  />
                </div>
              ))}
            </div>
          )}

          {splitType === 'percentage' && (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{m.displayName}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="1"
                      value={percentSplits[m.id] || ''}
                      onChange={(e) => setPercentSplits({ ...percentSplits, [m.id]: e.target.value })}
                      className="w-20"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button type="submit" loading={submitting} className="w-full bg-[#5bc5a7] hover:bg-[#4aa88d] text-white">
            Save Changes
          </Button>
        </form>
      </Dialog>

      {/* Settle Up Modal */}
      <Dialog open={settleUpOpen} onClose={() => setSettleUpOpen(false)} title="Settle Up">
        <form onSubmit={handleSettlement} className="space-y-4">
          {/* Helper text */}
          <p className="text-sm text-[var(--muted-foreground)]">
            Record a payment from one person to another. Use Smart Settle for optimal suggestions.
          </p>
          <Select
            label="Who is Paying?"
            value={settleFromId}
            onChange={(val) => {
              setSettleFromId(val);
              // Auto-clear "to" if same person selected
              if (val === settleToId) setSettleToId('');
            }}
            options={balances.map(b => ({ 
              value: b.memberId, 
              label: b.netBalance < 0 
                ? `${b.displayName} (owes ${formatCents(Math.abs(b.netBalance))})` 
                : b.netBalance > 0
                  ? `${b.displayName} (owed ${formatCents(b.netBalance)})`
                  : `${b.displayName} (settled)`
            }))}
          />
          <Select
            label="Who is Receiving?"
            value={settleToId}
            onChange={setSettleToId}
            options={balances.filter(b => b.memberId !== settleFromId).map(b => ({ 
              value: b.memberId, 
              label: b.netBalance < 0 
                ? `${b.displayName} (owes ${formatCents(Math.abs(b.netBalance))})` 
                : b.netBalance > 0
                  ? `${b.displayName} (owed ${formatCents(b.netBalance)})`
                  : `${b.displayName} (settled)`
            }))}
          />
          <Input
            label="Amount (€)"
            type="number"
            step="0.01"
            value={settleAmount}
            onChange={(e) => setSettleAmount(e.target.value)}
          />
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={PAYMENT_METHODS.map(m => ({ value: m.id, label: m.label }))}
          />
          <Button type="submit" loading={submitting} className="w-full bg-[#5bc5a7] hover:bg-[#4aa88d] text-white">
            Record Settlement
          </Button>
        </form>
      </Dialog>

      {/* Budget Modal */}
      <Dialog open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} title="Set Budget">
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <Input
            label="Monthly Limit (€)"
            type="number"
            step="0.01"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
            placeholder="1000.00"
          />
          <Input
            label="Alert at (%)"
            type="number"
            value={budgetAlertAt}
            onChange={(e) => setBudgetAlertAt(e.target.value)}
            placeholder="80"
          />
          <Button type="submit" className="w-full bg-[#5bc5a7] hover:bg-[#4aa88d] text-white">
            Save Budget
          </Button>
        </form>
      </Dialog>

      {/* Who Pays Spinner Modal */}
      <Dialog open={spinnerOpen} onClose={() => !isSpinning && setSpinnerOpen(false)} title="🎲 Who Pays?">
        <div className="space-y-4">
          {/* Weighted Toggle */}
          <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
            <div>
              <p className="font-medium text-[var(--foreground)]">Weight by balance</p>
              <p className="text-xs text-[var(--muted-foreground)]">People who owe more have higher chance</p>
            </div>
            <button
              onClick={() => setSpinnerWeighted(!spinnerWeighted)}
              className={`w-12 h-6 rounded-full transition-colors ${spinnerWeighted ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              disabled={isSpinning}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${spinnerWeighted ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Spinner Wheel */}
          <div className="relative w-64 h-64 mx-auto">
            {/* Pointer/Arrow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-purple-600" />
            </div>
            
            {/* Wheel */}
            <svg 
              viewBox="0 0 200 200" 
              className="w-full h-full drop-shadow-lg"
              style={{ 
                transform: `rotate(${spinnerRotation}deg)`,
                transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
              }}
            >
              {members.map((member, index) => {
                const segmentAngle = 360 / members.length;
                const startAngle = index * segmentAngle - 90;
                const endAngle = startAngle + segmentAngle;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 100 + 95 * Math.cos(startRad);
                const y1 = 100 + 95 * Math.sin(startRad);
                const x2 = 100 + 95 * Math.cos(endRad);
                const y2 = 100 + 95 * Math.sin(endRad);
                const largeArc = segmentAngle > 180 ? 1 : 0;
                
                const colors = [
                  '#ef4444', '#f97316', '#eab308', '#22c55e', 
                  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
                ];
                const color = colors[index % colors.length];
                
                // Text position
                const midAngle = startAngle + segmentAngle / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const textX = 100 + 55 * Math.cos(midRad);
                const textY = 100 + 55 * Math.sin(midRad);
                
                return (
                  <g key={member.id}>
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={color}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {member.displayName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="100" cy="100" r="20" fill="white" stroke="#e5e7eb" strokeWidth="2" />
              <circle cx="100" cy="100" r="12" fill="#8b5cf6" />
            </svg>
          </div>

          {/* Winner Announcement */}
          <AnimatePresence>
            {spinnerWinner && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-center p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white"
              >
                <p className="text-lg">🎉 The wheel has spoken!</p>
                <p className="text-2xl font-bold mt-1">{spinnerWinner} pays!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin Button */}
          <Button
            onClick={handleSpinWheel}
            disabled={isSpinning || members.length < 2}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3"
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Spinning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Dices className="w-5 h-5" />
                {spinnerWinner ? 'Spin Again!' : 'Spin the Wheel!'}
              </span>
            )}
          </Button>

          {members.length < 2 && (
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              Need at least 2 members to spin!
            </p>
          )}
        </div>
      </Dialog>

      {/* Smart Settle Modal - Available to ALL users */}
      <Dialog 
        open={smartSettleOpen} 
        onClose={() => setSmartSettleOpen(false)} 
        title="⚡ Smart Settle"
      >
        <div className="space-y-4">
          {loadingSmartSettle ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : smartSettleSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-semibold text-[var(--foreground)]">All Settled Up!</p>
              <p className="text-sm text-[var(--muted-foreground)]">No payments needed</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--muted-foreground)]">
                Minimum {smartSettleSuggestions.length} transaction{smartSettleSuggestions.length !== 1 ? 's' : ''} to settle all debts:
              </p>
              <div className="space-y-3">
                {smartSettleSuggestions.map((suggestion, idx) => {
                  const isYouPaying = suggestion.fromId === user.id;
                  const isYouReceiving = suggestion.toId === user.id;
                  const fromMember = members.find(m => m.id === suggestion.fromId);
                  const toMember = members.find(m => m.id === suggestion.toId);
                  
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-xl border ${
                        isYouPaying || isYouReceiving 
                          ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20' 
                          : 'border-[var(--border)] bg-[var(--card)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={suggestion.fromName} avatarUrl={fromMember?.avatarUrl} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isYouPaying ? 'text-violet-600 dark:text-violet-400' : 'text-[var(--foreground)]'}`}>
                              {isYouPaying ? 'You' : suggestion.fromName}
                            </span>
                            <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                            <span className={`font-medium ${isYouReceiving ? 'text-violet-600 dark:text-violet-400' : 'text-[var(--foreground)]'}`}>
                              {isYouReceiving ? 'You' : suggestion.toName}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {isYouPaying ? 'You pay' : isYouReceiving ? 'You receive' : `${suggestion.fromName} pays`}
                          </p>
                        </div>
                        <div className={`font-bold text-lg ${isYouPaying ? 'text-[#ff652f]' : isYouReceiving ? 'text-[#5bc5a7]' : 'text-[var(--foreground)]'}`}>
                          {formatCents(suggestion.amountCents)}
                        </div>
                        {isYouPaying && (
                          <button
                            onClick={() => {
                              setSmartSettleOpen(false);
                              handleQuickSettle(suggestion.fromId, suggestion.toId, suggestion.amountCents);
                            }}
                            className="px-3 py-1.5 bg-violet-500 text-white text-sm rounded-lg hover:bg-violet-600"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Help text */}
              <p className="text-xs text-center text-[var(--muted-foreground)] pt-2">
                This shows the optimal way to settle all debts with minimum transactions
              </p>
            </>
          )}
        </div>
      </Dialog>

      {/* Debt Breakdown Modal */}
      <Dialog 
        open={!!debtBreakdownMember} 
        onClose={() => setDebtBreakdownMember(null)} 
        title={debtBreakdownMember ? `Balance with ${debtBreakdownMember.name}` : 'Balance Breakdown'}
      >
        {debtBreakdownMember && (() => {
          const breakdown = getDebtBreakdown(debtBreakdownMember.id);
          const memberData = members.find(m => m.id === debtBreakdownMember.id);
          
          return (
            <div className="space-y-4">
              {/* Summary */}
              <div className="text-center p-4 bg-[var(--muted)] rounded-xl">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Avatar name={user.displayName} size="sm" />
                  <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <Avatar name={debtBreakdownMember.name} avatarUrl={memberData?.avatarUrl} size="sm" />
                </div>
                <p className={`text-2xl font-bold ${breakdown.netAmount > 0 ? 'text-[#ff652f]' : breakdown.netAmount < 0 ? 'text-[#5bc5a7]' : 'text-[var(--foreground)]'}`}>
                  {breakdown.netAmount > 0 ? (
                    <>You owe {formatCents(breakdown.netAmount)}</>
                  ) : breakdown.netAmount < 0 ? (
                    <>{debtBreakdownMember.name} owes you {formatCents(Math.abs(breakdown.netAmount))}</>
                  ) : (
                    <>All settled up!</>
                  )}
                </p>
              </div>

              {/* Expenses where they paid */}
              {breakdown.theyPaidYouOwe.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff652f]" />
                    {debtBreakdownMember.name} paid (you owe)
                  </h4>
                  <div className="space-y-2">
                    {breakdown.theyPaidYouOwe.slice(0, 5).map((expense) => {
                      const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
                      const Icon = category.icon;
                      return (
                        <div key={expense.id} className="flex items-center gap-2 p-2 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                          <div className={`w-6 h-6 rounded ${category.color} flex items-center justify-center`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-[var(--foreground)] truncate block">{expense.description}</span>
                            <span className="text-xs text-[var(--muted-foreground)]">
                              Total: {formatCents(expense.totalAmount)} · Your share: {formatCents(expense.amountOwed)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-[#ff652f]">+{formatCents(expense.amountOwed)}</span>
                        </div>
                      );
                    })}
                    {breakdown.theyPaidYouOwe.length > 5 && (
                      <p className="text-xs text-[var(--muted-foreground)] text-center">
                        +{breakdown.theyPaidYouOwe.length - 5} more expenses
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Expenses where you paid */}
              {breakdown.youPaidTheyOwe.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#5bc5a7]" />
                    You paid ({debtBreakdownMember.name} owes)
                  </h4>
                  <div className="space-y-2">
                    {breakdown.youPaidTheyOwe.slice(0, 5).map((expense) => {
                      const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
                      const Icon = category.icon;
                      return (
                        <div key={expense.id} className="flex items-center gap-2 p-2 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                          <div className={`w-6 h-6 rounded ${category.color} flex items-center justify-center`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-[var(--foreground)] truncate block">{expense.description}</span>
                            <span className="text-xs text-[var(--muted-foreground)]">
                              Total: {formatCents(expense.totalAmount)} · {debtBreakdownMember.name}&apos;s share: {formatCents(expense.amountOwed)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-[#5bc5a7]">-{formatCents(expense.amountOwed)}</span>
                        </div>
                      );
                    })}
                    {breakdown.youPaidTheyOwe.length > 5 && (
                      <p className="text-xs text-[var(--muted-foreground)] text-center">
                        +{breakdown.youPaidTheyOwe.length - 5} more expenses
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Settlements summary */}
              {(breakdown.settlementsFromMe.length > 0 || breakdown.settlementsToMe.length > 0) && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Settlements</h4>
                  {breakdown.totalIPaid > 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      You've paid {debtBreakdownMember.name}: <span className="text-[#5bc5a7] font-medium">{formatCents(breakdown.totalIPaid)}</span>
                    </p>
                  )}
                  {breakdown.totalTheyPaid > 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {debtBreakdownMember.name} has paid you: <span className="text-[#5bc5a7] font-medium">{formatCents(breakdown.totalTheyPaid)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* No transactions */}
              {breakdown.theyPaidYouOwe.length === 0 && breakdown.youPaidTheyOwe.length === 0 && (
                <p className="text-center text-[var(--muted-foreground)] py-4">
                  No shared expenses with {debtBreakdownMember.name}
                </p>
              )}
            </div>
          );
        })()}
      </Dialog>

      {/* Profile Edit Modal */}
      <Dialog open={profileEditOpen} onClose={() => setProfileEditOpen(false)} title="Edit Profile">
        <div className="space-y-5">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--muted)] flex items-center justify-center">
              {editAvatarUrl ? (
                <img src={editAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <span className={`text-2xl font-bold text-white ${getAvatarColor(editDisplayName || 'U')} w-full h-full flex items-center justify-center`}>
                  {getInitials(editDisplayName || 'U')}
                </span>
              )}
            </div>
            {editAvatarUrl && (
              <button
                onClick={() => setEditAvatarUrl('')}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Remove Photo
              </button>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Display Name</label>
            <Input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          {/* Avatar Method Toggle */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Profile Photo</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setAvatarUploadMethod('upload')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                  avatarUploadMethod === 'upload'
                    ? 'bg-[#5bc5a7] text-white'
                    : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
                }`}
              >
                📷 Upload Photo
              </button>
              <button
                onClick={() => setAvatarUploadMethod('url')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                  avatarUploadMethod === 'url'
                    ? 'bg-[#5bc5a7] text-white'
                    : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
                }`}
              >
                🔗 Enter URL
              </button>
            </div>

            {avatarUploadMethod === 'upload' ? (
              <div>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="w-full py-3 px-4 border-2 border-dashed border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:border-[#5bc5a7] hover:text-[#5bc5a7] transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" />
                      Choose from Gallery
                    </span>
                  )}
                </button>
                <p className="text-xs text-[var(--muted-foreground)] mt-2 text-center">
                  Supported: JPG, PNG, GIF (max 5MB)
                </p>
              </div>
            ) : (
              <div>
                <Input
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://i.ytimg.com/vi/TOwuwgogtts/sddefault.jpg"
                  type="url"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  Paste a direct link to your profile image
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveProfile}
            loading={profileSaving}
            className="w-full"
          >
            Save Changes
          </Button>
        </div>
      </Dialog>

      {/* Add Chore Modal */}
      <Dialog
        open={addChoreOpen}
        onClose={() => {
          setAddChoreOpen(false);
          setNewChoreName('');
          setNewChoreIcon('🧹');
          setNewChoreFrequency('weekly');
        }}
        title="✨ Add New Chore"
      >
        <form onSubmit={handleCreateChore} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Chore Name</label>
            <Input
              value={newChoreName}
              onChange={(e) => setNewChoreName(e.target.value)}
              placeholder="e.g., Kitchen cleaning"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {['🧹', '🧽', '🗑️', '🚿', '🧺', '🍳', '🪣', '🧴', '🛁', '🚽'].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewChoreIcon(icon)}
                  className={`w-10 h-10 text-xl rounded-lg border transition-colors ${
                    newChoreIcon === icon
                      ? 'border-[#5bc5a7] bg-[#5bc5a7]/10'
                      : 'border-[var(--border)] hover:border-[#5bc5a7]/50'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Frequency</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewChoreFrequency('weekly')}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  newChoreFrequency === 'weekly'
                    ? 'border-[#5bc5a7] bg-[#5bc5a7]/10 text-[#5bc5a7]'
                    : 'border-[var(--border)] text-[var(--foreground)]'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setNewChoreFrequency('biweekly')}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  newChoreFrequency === 'biweekly'
                    ? 'border-[#5bc5a7] bg-[#5bc5a7]/10 text-[#5bc5a7]'
                    : 'border-[var(--border)] text-[var(--foreground)]'
                }`}
              >
                Every 2 Weeks
              </button>
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={!newChoreName.trim()}>
            <Plus className="w-4 h-4 mr-2" /> Add Chore
          </Button>
        </form>
      </Dialog>

      {/* House Voice Signal Modal */}
      <Dialog 
        open={houseVoiceOpen} 
        onClose={() => {
          setHouseVoiceOpen(false);
          setSignalCategory('');
          setSignalMessage('');
        }} 
        title="🎙️ Submit Anonymous Signal"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Your identity will never be revealed. Please use calm, neutral language.
          </p>

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Select Category *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SIGNAL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSignalCategory(cat.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    signalCategory === cat.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                      : 'border-[var(--border)] bg-[var(--card)] hover:border-purple-300'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <p className="text-sm font-medium text-[var(--foreground)] mt-1">
                    {cat.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Message (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Message (Optional)
            </label>
            <textarea
              value={signalMessage}
              onChange={(e) => setSignalMessage(e.target.value)}
              placeholder={SIGNAL_CATEGORIES.find(c => c.id === signalCategory)?.placeholder || 'Add a brief, neutral message...'}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-[var(--muted-foreground)] flex justify-between">
              <span>No names, no "you/he/she", keep it neutral</span>
              <span>{signalMessage.length}/200</span>
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Signals cannot be edited or deleted. They expire automatically in 30 days.
              </span>
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmitSignal}
            disabled={!signalCategory || signalSubmitting}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90"
          >
            {signalSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Submit Anonymously
              </>
            )}
          </Button>
        </div>
      </Dialog>

      {/* Shopping List Modal */}
      <Dialog 
        open={shoppingListOpen} 
        onClose={() => setShoppingListOpen(false)} 
        title="🛒 Shopping List"
      >
        <div className="space-y-4">
          {/* Add Item Form */}
          <form onSubmit={handleAddShoppingItem} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newShoppingItem}
                onChange={(e) => setNewShoppingItem(e.target.value)}
                placeholder="What's needed? (e.g., Milk)"
                className="flex-1"
              />
              <Input
                value={newShoppingQuantity}
                onChange={(e) => setNewShoppingQuantity(e.target.value)}
                placeholder="Qty"
                className="w-20"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={shoppingCategory}
                onChange={(e) => setShoppingCategory(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm"
              >
                <option value="groceries">🥬 Groceries</option>
                <option value="household">🏠 Household</option>
                <option value="personal">👤 Personal</option>
                <option value="other">📦 Other</option>
              </select>
              <Button type="submit" disabled={shoppingLoading || !newShoppingItem.trim()}>
                {shoppingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>
          </form>

          {/* Items List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {/* Pending Items */}
            {shoppingItems.filter(i => !i.purchased).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Needed ({shoppingItems.filter(i => !i.purchased).length})
                </h4>
                {shoppingItems.filter(i => !i.purchased).map((item) => {
                  const categoryIcon = item.category === 'groceries' ? '🥬' : item.category === 'household' ? '🏠' : item.category === 'personal' ? '👤' : '📦';
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                      <button
                        onClick={() => handleTogglePurchased(item.id, true)}
                        className="w-6 h-6 rounded-full border-2 border-orange-400 flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                      >
                        <Check className="w-4 h-4 text-orange-400 opacity-0 hover:opacity-100" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--foreground)] truncate">
                          {categoryIcon} {item.name}
                          {item.quantity && <span className="text-[var(--muted-foreground)] text-sm ml-1">({item.quantity})</span>}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Added by {item.addedBy.displayName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteShoppingItem(item.id)}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Purchased Items */}
            {shoppingItems.filter(i => i.purchased).length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[var(--muted-foreground)] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Purchased ({shoppingItems.filter(i => i.purchased).length})
                  </h4>
                  <button
                    onClick={handleClearPurchased}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                {shoppingItems.filter(i => i.purchased).map((item) => {
                  const categoryIcon = item.category === 'groceries' ? '🥬' : item.category === 'household' ? '🏠' : item.category === 'personal' ? '👤' : '📦';
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] opacity-60">
                      <button
                        onClick={() => handleTogglePurchased(item.id, false)}
                        className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--foreground)] line-through truncate">
                          {categoryIcon} {item.name}
                          {item.quantity && <span className="text-[var(--muted-foreground)] text-sm ml-1">({item.quantity})</span>}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          ✓ Bought by {item.purchasedBy?.displayName || 'Unknown'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteShoppingItem(item.id)}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {shoppingItems.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-[var(--muted-foreground)]">No items in the list</p>
                <p className="text-sm text-[var(--muted-foreground)]">Add items your household needs!</p>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Smart Grocery Prediction Modal */}
      <Dialog 
        open={groceryPredictionOpen} 
        onClose={() => setGroceryPredictionOpen(false)} 
        title="📊 Smart Grocery Tracker"
      >
        <div className="space-y-4">
          {/* Add Item Form */}
          <form onSubmit={handleAddGroceryItem} className="space-y-3 pb-3 border-b border-[var(--border)]">
            <div className="flex gap-2">
              <Input
                value={newGroceryName}
                onChange={(e) => setNewGroceryName(e.target.value)}
                placeholder="Item name (e.g., Milk)"
                className="flex-1"
              />
              <Input
                value={newGroceryQuantity}
                onChange={(e) => setNewGroceryQuantity(e.target.value)}
                placeholder="Qty"
                type="number"
                step="0.1"
                min="0"
                className="w-20"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newGroceryUnit}
                onChange={(e) => setNewGroceryUnit(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm"
              >
                <option value="pieces">Pieces</option>
                <option value="liters">Liters</option>
                <option value="kg">Kilograms</option>
                <option value="packs">Packs</option>
                <option value="bottles">Bottles</option>
                <option value="cans">Cans</option>
                <option value="boxes">Boxes</option>
                <option value="bags">Bags</option>
              </select>
              <Button type="submit" disabled={groceryLoading || !newGroceryName.trim() || !newGroceryQuantity}>
                {groceryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>
          </form>

          {/* Smart Suggestions Panel */}
          {grocerySuggestions.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h4 className="font-semibold text-red-700 dark:text-red-400">Running Low</h4>
              </div>
              <div className="space-y-2">
                {grocerySuggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <span className="text-red-800 dark:text-red-300">{suggestion.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Items List */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {groceryLoading && groceryItems.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
              </div>
            ) : groceryItems.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Tracked Items ({groceryItems.length})
                </h4>
                {groceryItems.map((item) => {
                  const purchaseDate = new Date(item.purchaseDate);
                  const finishDate = item.predictedFinishDate ? new Date(item.predictedFinishDate) : null;
                  
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-4 ${getUrgencyBgColor(item.urgencyLevel)}`}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${getUrgencyColor(item.urgencyLevel)}`} />
                          <span className="font-semibold text-[var(--foreground)] capitalize">{item.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMarkGroceryFinished(item.id)}
                            className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                            title="Mark as finished"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroceryItem(item.id)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                          <p className="text-[var(--muted-foreground)] text-xs">Initial</p>
                          <p className="font-medium text-[var(--foreground)]">
                            {item.quantity} {item.unit}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                          <p className="text-[var(--muted-foreground)] text-xs">Remaining</p>
                          <p className={`font-medium ${item.urgencyLevel === 'red' ? 'text-red-600 dark:text-red-400' : item.urgencyLevel === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : 'text-[var(--foreground)]'}`}>
                            {item.remainingQuantity.toFixed(1)} {item.unit}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                          <p className="text-[var(--muted-foreground)] text-xs">Avg Daily Use</p>
                          <p className="font-medium text-[var(--foreground)]">
                            {item.avgDailyUsage !== null ? `${item.avgDailyUsage.toFixed(2)} ${item.unit}/day` : 'Learning...'}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2">
                          <p className="text-[var(--muted-foreground)] text-xs">Days Left</p>
                          <p className={`font-medium ${item.urgencyLevel === 'red' ? 'text-red-600 dark:text-red-400' : item.urgencyLevel === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : 'text-[var(--foreground)]'}`}>
                            {item.daysLeft !== null ? `~${item.daysLeft.toFixed(1)} days` : 'Unknown'}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Bought: {purchaseDate.toLocaleDateString()}</span>
                        {finishDate && (
                          <span className={item.isFinishingSoon ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            Est. finish: {finishDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Finishing Soon Badge */}
                      {item.isFinishingSoon && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Likely finishing soon</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-[var(--muted-foreground)]">No items tracked yet</p>
                <p className="text-sm text-[var(--muted-foreground)]">Add grocery items to track usage and get smart predictions!</p>
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg p-3">
            <p className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>Predictions improve each time you buy an item again. Mark items as finished when empty to help the system learn your usage patterns.</span>
            </p>
          </div>
        </div>
      </Dialog>

      {/* Charts Modal */}
      <Dialog open={chartsOpen} onClose={() => { setChartsOpen(false); setChartTab('category'); }} title="Spending Overview">
        <div className="space-y-4">
          {/* Summary Header */}
          <div className="text-center pb-3 border-b border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)]">{formatMonth(selectedMonth)}</p>
            <p className="text-3xl font-bold text-[#5bc5a7]">{formatCents(totalMonthlySpent)}</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-[var(--muted)] rounded-lg">
            {[
              { id: 'category' as const, label: 'By Category' },
              { id: 'trends' as const, label: '6-Month Trends' },
              { id: 'members' as const, label: 'By Member' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setChartTab(tab.id)}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  chartTab === tab.id
                    ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Tab - Pie Chart */}
          {chartTab === 'category' && (
            <div className="space-y-4">
              {categoryTotals.length > 0 ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`€${value.toFixed(2)}`, '']}
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--foreground)',
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {categoryTotals.map((cat, idx) => {
                      const percent = Math.round((cat.amount / totalMonthlySpent) * 100);
                      const Icon = cat.icon;
                      return (
                        <div key={cat.id} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <Icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                          <span className="flex-1 text-[var(--foreground)]">{cat.label}</span>
                          <span className="text-[var(--muted-foreground)]">{percent}%</span>
                          <span className="font-medium text-[var(--foreground)] w-20 text-right">{formatCents(cat.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-center text-[var(--muted-foreground)] py-8">No expenses this month</p>
              )}
            </div>
          )}

          {/* Trends Tab - Bar Chart */}
          {chartTab === 'trends' && (
            <div className="space-y-3">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      tickFormatter={(v) => `€${v}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`€${value.toFixed(2)}`, 'Spent']}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--foreground)',
                      }}
                    />
                    <Bar dataKey="amount" fill="#5bc5a7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-xs text-[var(--muted-foreground)] px-2">
                <span>Last 6 months</span>
                <span>
                  Total: €{monthlyTrends.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {chartTab === 'members' && (
            <div className="space-y-3">
              {memberSpending.length > 0 ? (
                memberSpending.map((member, idx) => {
                  const percent = totalMonthlySpent > 0 ? Math.round((member.amount / totalMonthlySpent) * 100) : 0;
                  return (
                    <div key={member.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Avatar name={member.name} size="sm" />
                        <span className="flex-1 text-sm font-medium text-[var(--foreground)]">{member.name}</span>
                        <span className="text-sm text-[var(--muted-foreground)]">{percent}%</span>
                        <span className="text-sm font-medium text-[var(--foreground)] w-20 text-right">{formatCents(member.amount)}</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden ml-10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                          className="h-full bg-gradient-to-r from-[#5bc5a7] to-[#4db896]"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-[var(--muted-foreground)] py-8">No spending data available</p>
              )}
            </div>
          )}
        </div>
      </Dialog>

      {/* Split History Modal */}
      <Dialog open={!!splitHistoryExpense} onClose={() => setSplitHistoryExpense(null)} title="Split Details">
        {splitHistoryExpense && (
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-[var(--border)]">
              <CategoryIcon category={splitHistoryExpense.category} size="md" />
              <h3 className="font-semibold text-[var(--foreground)] mt-2">{splitHistoryExpense.description}</h3>
              <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{formatCents(splitHistoryExpense.amountCents)}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Paid by {splitHistoryExpense.paidBy.displayName}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-[var(--foreground)]">Split Breakdown</h4>
              {splitHistoryExpense.splits.map((split) => {
                const percent = Math.round((split.shareCents / splitHistoryExpense.amountCents) * 100);
                return (
                  <div key={split.memberId} className="flex items-center gap-3 p-2 bg-[var(--muted)] rounded-lg">
                    <Avatar name={split.member.displayName} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">{split.member.displayName}</p>
                      <div className="w-full h-1.5 bg-[var(--background)] rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-[#5bc5a7]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--foreground)]">{formatCents(split.shareCents)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{percent}%</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {splitHistoryExpense.notes && (
              <div className="pt-4 border-t border-[var(--border)]">
                <h4 className="font-medium text-[var(--foreground)] mb-1">Notes</h4>
                <p className="text-sm text-[var(--muted-foreground)]">
                  <RenderWithMentions text={splitHistoryExpense.notes} members={members} />
                </p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Quick Scan Confirmation Modal */}
      <Dialog 
        open={quickScanOpen} 
        onClose={() => {
          setQuickScanOpen(false);
          setQuickScanResult(null);
        }} 
        title="📸 Quick Scan"
      >
        <div className="space-y-4">
          {scanning && !quickScanResult ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <p className="text-[var(--muted-foreground)]">AI is analyzing your receipt...</p>
            </div>
          ) : quickScanResult ? (
            <>
              {/* Scanned Result */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-violet-200 dark:border-violet-800">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={URL.createObjectURL(quickScanResult.file)} 
                      alt="Receipt" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--foreground)] text-lg">{quickScanResult.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryIcon category={quickScanResult.category} size="sm" />
                      <span className="text-sm text-[var(--muted-foreground)] capitalize">{quickScanResult.category}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-violet-200 dark:border-violet-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)]">Amount</span>
                    <span className="text-2xl font-bold text-[#5bc5a7]">€{quickScanResult.amount.toFixed(2)}</span>
                  </div>
                </div>

                {quickScanResult.confidence !== 'high' && (
                  <div className={`mt-3 flex items-center gap-2 text-sm ${
                    quickScanResult.confidence === 'low' ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {quickScanResult.confidence === 'low' 
                        ? 'Low confidence - please verify details' 
                        : 'Medium confidence - double check amount'}
                    </span>
                  </div>
                )}
              </div>

              {/* Split Preview */}
              <div className="bg-[var(--muted)] p-4 rounded-xl">
                <h4 className="font-medium text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Split equally among {members.length} roommates
                </h4>
                <div className="space-y-2">
                  {members.map((m) => {
                    const share = quickScanResult.amount / members.length;
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar name={m.displayName} size="sm" />
                          <span className="text-sm text-[var(--foreground)]">{m.displayName}</span>
                        </div>
                        <span className="text-sm font-medium text-[var(--foreground)]">€{share.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Transfer to manual form
                    setAmount(quickScanResult.amount.toFixed(2));
                    setDescription(quickScanResult.description);
                    setCategory(quickScanResult.category);
                    setBillFile(quickScanResult.file);
                    setPaidById(user.id);
                    setQuickScanOpen(false);
                    setQuickScanResult(null);
                    setAddExpenseOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-[#5bc5a7] hover:bg-[#4aa88d]"
                  loading={quickScanSubmitting}
                  onClick={handleQuickScanConfirm}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={!!imageViewerUrl} onClose={() => setImageViewerUrl(null)} title="Receipt">
        {imageViewerUrl && (
          <div className="relative">
            <img src={imageViewerUrl} alt="Receipt" className="w-full rounded-lg" />
          </div>
        )}
      </Dialog>

      {/* Receipt Detail Modal (from Archive) */}
      <Dialog 
        open={!!selectedReceipt} 
        onClose={() => setSelectedReceipt(null)} 
        title="Receipt Details"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            {/* Receipt Image */}
            {selectedReceipt.billPhotoUrl && (
              <div className="relative rounded-xl overflow-hidden bg-[var(--muted)]">
                <img 
                  src={selectedReceipt.billPhotoUrl} 
                  alt={selectedReceipt.description}
                  className="w-full max-h-[300px] object-contain"
                />
              </div>
            )}

            {/* Expense Details */}
            <div className="p-4 bg-[var(--muted)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={selectedReceipt.category} />
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{selectedReceipt.description}</p>
                    <p className="text-sm text-[var(--muted-foreground)] capitalize">{selectedReceipt.category}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-[#5bc5a7]">{formatCents(selectedReceipt.amountCents)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Paid by</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar name={selectedReceipt.paidBy.displayName} size="sm" />
                    <span className="text-sm text-[var(--foreground)]">{selectedReceipt.paidBy.displayName}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Date</p>
                  <p className="text-sm text-[var(--foreground)] mt-1">{formatMonth(selectedReceipt.month)}</p>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)]">Notes</p>
                  <p className="text-sm text-[var(--foreground)] mt-1">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>

            {/* Split Breakdown */}
            <div className="p-4 bg-[var(--muted)] rounded-xl">
              <h4 className="font-medium text-[var(--foreground)] mb-3">Split Breakdown</h4>
              <div className="space-y-2">
                {selectedReceipt.splits.map((split) => (
                  <div key={split.memberId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={split.member.displayName} size="sm" />
                      <span className="text-sm text-[var(--foreground)]">{split.member.displayName}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{formatCents(split.shareCents)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditExpense(selectedReceipt);
                  setSelectedReceipt(null);
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (selectedReceipt.billPhotoUrl) {
                    window.open(selectedReceipt.billPhotoUrl, '_blank');
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Full Size
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

// Admin Invite Codes Component
function AdminInviteCodes() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const res = await fetch('/api/admin/invite-codes');
      const data = await res.json();
      setCodes(data?.codes ?? []);
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const regenerate = async (id: string) => {
    try {
      await fetch(`/api/admin/invite-codes/${id}/regenerate`, { method: 'POST' });
      toast.success('Code regenerated!');
      fetchCodes();
    } catch {
      toast.error('Failed to regenerate');
    }
  };

  if (loading) return null;

  return (
    <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
      <h3 className="font-semibold text-[var(--foreground)]">Invite Codes</h3>
      <div className="space-y-2">
        {codes.map((code) => (
          <div key={code.id} className="flex items-center gap-2 p-2 bg-[var(--muted)] rounded-lg">
            <span className="flex-1 font-mono text-sm text-[var(--foreground)]">{code.code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${code.used ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
              {code.used ? (code.usedByName || 'Used') : 'Available'}
            </span>
            {!code.used && (
              <>
                <button onClick={() => copyCode(code.code)} className="p-1 hover:bg-[var(--card)] rounded text-[var(--foreground)]">
                  <FileText className="w-4 h-4" />
                </button>
                <button onClick={() => regenerate(code.id)} className="p-1 hover:bg-[var(--card)] rounded text-[var(--foreground)]">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Admin Members Manager Component
function AdminMembersManager({ onMemberUpdate }: { onMemberUpdate?: () => void }) {
  const [members, setMembers] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isAdmin: boolean;
    joinedAt: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/admin/members');
      const data = await res.json();
      setMembers(data?.members ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingMember) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editingMember.displayName,
          avatarUrl: editingMember.avatarUrl
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }
      toast.success('Profile updated!');
      setEditingMember(null);
      fetchMembers();
      onMemberUpdate?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update member';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    // Use toast confirmation instead of browser confirm() which can be blocked in iframes
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium">Remove {name} from the group?</p>
        <p className="text-sm text-gray-500">This cannot be undone.</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' });
                if (!res.ok) {
                  const error = await res.json();
                  throw new Error(error.error || 'Failed to remove');
                }
                toast.success(`${name} removed from group`);
                fetchMembers();
                onMemberUpdate?.();
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
                toast.error(errorMessage);
              }
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Remove
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  if (loading) return null;

  return (
    <>
      <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">Manage Members</h3>
          <span className="text-xs text-[var(--muted-foreground)]">{members.length} members</span>
        </div>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-2 bg-[var(--muted)] rounded-lg">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5bc5a7] to-teal-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
                ) : (
                  member.displayName.charAt(0).toUpperCase()
                )}
              </div>
              
              {/* Name & Admin Badge */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--foreground)] truncate">{member.displayName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {member.isAdmin ? '👑 Admin' : 'Member'}
                </p>
              </div>
              
              {/* Edit Button */}
              <button
                onClick={() => setEditingMember({
                  id: member.id,
                  displayName: member.displayName,
                  avatarUrl: member.avatarUrl
                })}
                className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors"
                title="Edit Profile"
              >
                <Pencil className="w-4 h-4 text-[var(--muted-foreground)]" />
              </button>
              
              {/* Remove Button (only for non-admins) */}
              {!member.isAdmin && (
                <button
                  onClick={() => handleRemove(member.id, member.displayName)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Remove Member"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--card)] rounded-xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[var(--foreground)]">Edit Profile</h3>
              <button onClick={() => setEditingMember(null)} className="p-1 hover:bg-[var(--muted)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar Preview */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5bc5a7] to-teal-600 flex items-center justify-center text-white text-2xl font-semibold overflow-hidden">
                {editingMember.avatarUrl ? (
                  <img src={editingMember.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  editingMember.displayName.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Display Name</label>
              <input
                type="text"
                value={editingMember.displayName}
                onChange={(e) => setEditingMember({ ...editingMember, displayName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]"
                placeholder="Enter name"
                maxLength={50}
              />
            </div>

            {/* Avatar URL Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Avatar URL (optional)</label>
              <input
                type="url"
                value={editingMember.avatarUrl || ''}
                onChange={(e) => setEditingMember({ ...editingMember, avatarUrl: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)]"
                placeholder="https://upload.wikimedia.org/wikipedia/commons/6/67/User_Avatar.png"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Paste a direct image URL</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setEditingMember(null)}
                className="flex-1 py-2 rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingMember.displayName.trim()}
                className="flex-1 py-2 rounded-lg bg-[#5bc5a7] text-white hover:bg-[#4aa88d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}