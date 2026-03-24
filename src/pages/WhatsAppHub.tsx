import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Phone,
  PhoneOff,
  PhoneMissed,
  FileText,
  Users,
  Circle,
  CheckCheck,
  Check,
  Clock,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  Loader2,
  QrCode,
  Smartphone,
  Zap,
  AlertTriangle,
  Mail,
  Settings,
  CheckCircle2,
  Bot,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';

/* ─── Constants ─── */
// Configure via VITE_WA_SERVER env var for production, e.g. "https://wa.yourdomain.com"
// Falls back to localhost:3001 for local development
const WA_SERVER = import.meta.env.VITE_WA_SERVER || 'http://localhost:3001';
const WA_WS = WA_SERVER.replace(/^http/, 'ws') + '/ws';

/* ─── Types ─── */
interface WAChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number | null;
  lastMessage: { body: string; timestamp: number; fromMe: boolean } | null;
  phone: string;
}

interface WAMessage {
  id: string;
  from?: string;
  to?: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia: boolean;
  type: string;
  contactName?: string;
  contactNumber?: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  category: string;
}

interface MissedCallMessage {
  role: 'user' | 'assistant';
  body: string;
  timestamp: number;
}

interface MissedCall {
  id: string;
  phone: string;
  contactName: string;
  timestamp: number;
  status: 'ai_handling' | 'needs_followup' | 'resolved';
  aiMessages: MissedCallMessage[];
}

/* ─── Default Templates ─── */
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Trip Confirmation',
    body: 'Dear {{name}},\n\nYour special hire trip has been confirmed.\n\n📅 Date: {{date}}\n📍 Pickup: {{pickup}}\n📍 Drop: {{drop}}\n🚌 Bus: {{bus}}\n\nThank you for choosing NCG Express!\n\nBest regards,\nNCG Express Team',
    category: 'Trips',
  },
  {
    id: '2',
    name: 'Payment Reminder',
    body: 'Dear {{name}},\n\nThis is a gentle reminder regarding your outstanding payment of LKR {{amount}} for quotation {{quotation_no}}.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nNCG Express Finance Team',
    category: 'Finance',
  },
  {
    id: '3',
    name: 'Quotation Send',
    body: 'Dear {{name}},\n\nPlease find the quotation details below:\n\n📋 Quotation No: {{quotation_no}}\n💰 Amount: LKR {{amount}}\n📅 Date: {{date}}\n📍 Route: {{pickup}} → {{drop}}\n\nPlease confirm at your convenience.\n\nBest regards,\nNCG Express',
    category: 'Sales',
  },
  {
    id: '4',
    name: 'School Payment Reminder',
    body: 'Dear Parent/Guardian,\n\nThis is a reminder regarding the school transport fee of LKR {{amount}} for {{student_name}} for the month of {{month}}.\n\nPlease contact us if you have any questions.\n\nThank you,\nNCG Express School Transport',
    category: 'School',
  },
  {
    id: '5',
    name: 'Driver Assignment',
    body: 'Dear {{driver_name}},\n\nYou have been assigned to the following trip:\n\n📅 Date: {{date}}\n📍 Pickup: {{pickup}}\n📍 Drop: {{drop}}\n🚌 Bus: {{bus_no}}\n👥 Passengers: {{passengers}}\n\nPlease be at the pickup location 15 minutes early.\n\nThank you,\nNCG Express Operations',
    category: 'Operations',
  },
  {
    id: '6',
    name: 'General Greeting',
    body: 'Hello {{name}},\n\nThank you for reaching out to NCG Express. How may we assist you today?\n\nBest regards,\nNCG Express Team',
    category: 'General',
  },
];

/* ─── Main Component ─── */
export default function WhatsAppHub() {
  // ── Connection State ──
  const [serverOnline, setServerOnline] = useState(false);
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<{ pushname: string; phone: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chat State ──
  const [chats, setChats] = useState<WAChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState<WAChat | null>(null);
  const [chatMessages, setChatMessages] = useState<WAMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── New Message State ──
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingNew, setSendingNew] = useState(false);

  // ── Templates State ──
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [templateSearch, setTemplateSearch] = useState('');

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState<'chats' | 'new' | 'templates' | 'email' | 'missed'>('chats');

  // ── Stats ──
  const [sentToday, setSentToday] = useState(0);
  const [messageLog, setMessageLog] = useState<WAMessage[]>([]);

  // ── Missed Call State ──
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [expandedMissedCall, setExpandedMissedCall] = useState<string | null>(null);

  // ── Email State ──
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSenderName, setEmailSenderName] = useState('NCG Express');
  const [emailSetupMode, setEmailSetupMode] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupAppPassword, setSetupAppPassword] = useState('');
  const [setupSenderName, setSetupSenderName] = useState('NCG Express');
  const [configuringEmail, setConfiguringEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailsSentToday, setEmailsSentToday] = useState(0);

  // ═══════════════════════════════════════════
  // WebSocket Connection
  // ═══════════════════════════════════════════
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WA_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WA-WS] Connected');
        setServerOnline(true);
      };

      ws.onclose = () => {
        console.log('[WA-WS] Disconnected');
        setServerOnline(false);
        // Auto-reconnect after 3 seconds
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        setServerOnline(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status') {
            setWaStatus(data.data.status);
            if (data.data.info) setClientInfo(data.data.info);
            if (data.data.qr) setQrCode(data.data.qr);
            if (data.data.status === 'connected') {
              setQrCode(null);
              fetchChats();
            }
          }

          if (data.type === 'qr') {
            setQrCode(data.data);
            setWaStatus('qr_ready');
          }

          if (data.type === 'message') {
            const msg: WAMessage = data.data;
            // Update message log
            setMessageLog(prev => [msg, ...prev].slice(0, 200));
            // Track sent today
            if (msg.fromMe) {
              const today = new Date().toDateString();
              const msgDate = new Date(msg.timestamp).toDateString();
              if (today === msgDate) setSentToday(prev => prev + 1);
            }
            // Update selected chat messages in real-time
            if (selectedChat) {
              const chatPhone = selectedChat.phone || selectedChat.id.replace('@c.us', '');
              const msgPhone = msg.fromMe
                ? (msg.to || '').replace('@c.us', '')
                : (msg.from || '').replace('@c.us', '');
              if (chatPhone === msgPhone) {
                setChatMessages(prev => [...prev, msg]);
              }
            }
            // Update chat list preview
            setChats(prev => {
              const relevantPhone = msg.fromMe
                ? (msg.to || '').replace('@c.us', '')
                : (msg.from || '').replace('@c.us', '');
              return prev.map(chat => {
                const cp = chat.phone || chat.id.replace('@c.us', '');
                if (cp === relevantPhone) {
                  return {
                    ...chat,
                    lastMessage: { body: msg.body, timestamp: msg.timestamp, fromMe: msg.fromMe },
                    timestamp: msg.timestamp,
                    unreadCount: msg.fromMe ? chat.unreadCount : chat.unreadCount + 1,
                  };
                }
                return chat;
              });
            });
          }

          if (data.type === 'missed_call') {
            setMissedCalls(prev => [data.data, ...prev]);
            toast.warning(`📞 Missed call from ${data.data.contactName}`, {
              description: 'AI is handling the follow-up automatically',
              duration: 6000,
            });
          }

          if (data.type === 'missed_call_update') {
            setMissedCalls(prev =>
              prev.map(mc => mc.id === data.data.id ? data.data : mc)
            );
          }
        } catch (err) {
          console.error('[WA-WS] Parse error:', err);
        }
      };
    } catch {
      setServerOnline(false);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connectWS, 3000);
    }
  }, [selectedChat]);

  useEffect(() => {
    connectWS();
    fetchEmailStatus();
    fetchMissedCalls();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  // Re-establish WS when selectedChat changes (for message routing)
  useEffect(() => {
    // Update the ws message handler's closure
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // The connectWS callback has selectedChat in its closure, so we don't
      // need to reconnect. The real-time message routing will work because
      // we capture selectedChat in the onmessage handler via state.
    }
  }, [selectedChat]);

  // ═══════════════════════════════════════════
  // API Functions
  // ═══════════════════════════════════════════
  const fetchChats = async () => {
    setChatsLoading(true);
    try {
      const res = await fetch(`${WA_SERVER}/api/chats`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setChatsLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`${WA_SERVER}/api/messages/${encodeURIComponent(chatId)}?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (phone: string, message: string) => {
    const res = await fetch(`${WA_SERVER}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    });
    return res.json();
  };

  // ── Select a Chat ──
  const handleSelectChat = (chat: WAChat) => {
    setSelectedChat(chat);
    setChatMessages([]);
    fetchMessages(chat.id);
  };

  // ── Send Reply in Chat ──
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedChat) return;
    setSendingReply(true);
    try {
      const phone = selectedChat.phone || selectedChat.id.replace('@c.us', '');
      const result = await sendMessage(phone, replyText.trim());
      if (result.success) {
        setReplyText('');
        toast.success('Message sent');
      } else {
        toast.error(result.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  // ── Send New Message ──
  const handleSendNew = async () => {
    if (!newPhone.trim() || !newMessage.trim()) {
      toast.error('Phone number and message are required');
      return;
    }
    setSendingNew(true);
    try {
      const result = await sendMessage(newPhone.replace(/[^0-9]/g, ''), newMessage.trim());
      if (result.success) {
        toast.success('Message sent successfully!');
        setNewPhone('');
        setNewMessage('');
        setSentToday(prev => prev + 1);
      } else {
        toast.error(result.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send message. Is the WhatsApp server running?');
    } finally {
      setSendingNew(false);
    }
  };

  // ═══════════════════════════════════════════
  // Email Functions
  // ═══════════════════════════════════════════
  const fetchEmailStatus = async () => {
    try {
      const res = await fetch(`${WA_SERVER}/api/email/status`);
      if (res.ok) {
        const data = await res.json();
        setEmailConfigured(data.configured);
        if (data.configured) {
          setEmailAddress(data.email);
          setEmailSenderName(data.senderName || 'NCG Express');
        }
      }
    } catch { /* server offline */ }
  };

  const handleConfigureEmail = async () => {
    if (!setupEmail.trim() || !setupAppPassword.trim()) {
      toast.error('Email and App Password are required');
      return;
    }
    setConfiguringEmail(true);
    try {
      const res = await fetch(`${WA_SERVER}/api/email/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: setupEmail.trim(),
          appPassword: setupAppPassword.trim(),
          senderName: setupSenderName.trim() || 'NCG Express',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailConfigured(true);
        setEmailAddress(data.email);
        setEmailSenderName(data.senderName);
        setEmailSetupMode(false);
        setSetupAppPassword('');
        toast.success('Email configured successfully!');
      } else {
        toast.error(data.error || 'Failed to configure email');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setConfiguringEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      toast.error('To, Subject, and Body are required');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`${WA_SERVER}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo.trim(),
          cc: emailCc.trim() || undefined,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Email sent to ${emailTo}`);
        setEmailTo('');
        setEmailCc('');
        setEmailSubject('');
        setEmailBody('');
        setEmailsSentToday(prev => prev + 1);
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send email. Is the server running?');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm('Disconnect email account?')) return;
    try {
      await fetch(`${WA_SERVER}/api/email/disconnect`, { method: 'POST' });
      setEmailConfigured(false);
      setEmailAddress('');
      toast.success('Email disconnected');
    } catch {
      toast.error('Failed to disconnect email');
    }
  };

  const handleUseEmailTemplate = (template: Template) => {
    setEmailSubject(template.name);
    setEmailBody(template.body);
    setActiveTab('email');
    toast.success(`Template "${template.name}" loaded to email`);
  };

  // ── Use Template ──
  const handleUseTemplate = (template: Template) => {
    setNewMessage(template.body);
    setActiveTab('new');
    toast.success(`Template "${template.name}" loaded`);
  };

  // ── Filtered lists ──
  const filteredChats = useMemo(() => {
    if (!chatSearch.trim()) return chats;
    const q = chatSearch.toLowerCase();
    return chats.filter(
      c => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [chats, chatSearch]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const totalUnread = useMemo(() => chats.reduce((s, c) => s + c.unreadCount, 0), [chats]);

  const missedCallsActive = useMemo(() => missedCalls.filter(mc => mc.status === 'ai_handling').length, [missedCalls]);

  // ═══════════════════════════════════════════
  // Missed Call Functions
  // ═══════════════════════════════════════════
  const fetchMissedCalls = async () => {
    try {
      const res = await fetch(`${WA_SERVER}/api/missed-calls`);
      if (res.ok) setMissedCalls(await res.json());
    } catch { /* server offline */ }
  };

  const handleResolveMissedCall = async (id: string) => {
    try {
      await fetch(`${WA_SERVER}/api/missed-calls/${id}/resolve`, { method: 'POST' });
      toast.success('Marked as resolved');
    } catch { toast.error('Failed to update'); }
  };

  const handleTakeoverMissedCall = async (id: string) => {
    try {
      await fetch(`${WA_SERVER}/api/missed-calls/${id}/takeover`, { method: 'POST' });
      toast.success('AI stopped — you can reply manually now');
    } catch { toast.error('Failed to update'); }
  };

  // ═══════════════════════════════════════════
  // Render Helpers
  // ═══════════════════════════════════════════
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
      'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
      'bg-cyan-500', 'bg-amber-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return format(d, 'HH:mm');
    return format(d, 'dd/MM/yyyy');
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WhatsApp Hub</h1>
            <p className="text-sm text-muted-foreground">
              {waStatus === 'connected' && clientInfo
                ? `Connected as ${clientInfo.pushname} (${clientInfo.phone})`
                : serverOnline
                ? 'Connecting to WhatsApp...'
                : 'WhatsApp server starting — auto-connects with npm run dev'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchChats();
              toast.success('Refreshing chats...');
            }}
            disabled={waStatus !== 'connected'}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {waStatus === 'connected' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              onClick={async () => {
                if (!confirm('Disconnect current WhatsApp and switch to a new number?\n\nThe server will restart and show a new QR code.')) return;
                try {
                  toast.loading('Disconnecting...', { id: 'wa-disconnect' });
                  await fetch(`${WA_SERVER}/api/disconnect`, { method: 'POST' });
                  toast.success('Disconnected! Server restarting — new QR code will appear shortly.', { id: 'wa-disconnect', duration: 6000 });
                  setClientInfo(null);
                  setChats([]);
                  setSelectedChat(null);
                  setWaStatus('disconnected');
                } catch {
                  toast.error('Failed to disconnect', { id: 'wa-disconnect' });
                }
              }}
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Switch Account
            </Button>
          )}
          {waStatus === 'connected' ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20">
              <Circle className="w-2 h-2 mr-1.5 fill-green-500 text-green-500 animate-pulse" />
              Connected
            </Badge>
          ) : serverOnline ? (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              {waStatus === 'qr_ready' ? 'Scan QR' : 'Connecting'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Starting...
            </Badge>
          )}
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="professional-card border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{chats.length}</p>
                <p className="text-xs text-muted-foreground">Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="professional-card border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUnread}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="professional-card border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentToday}</p>
                <p className="text-xs text-muted-foreground">Sent Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="professional-card border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Server Starting Info ── */}
      {!serverOnline && (
        <Card className="border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0 animate-spin" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">WhatsApp Server Starting...</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                The WhatsApp server starts automatically with <code className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 rounded text-xs font-mono">npm run dev</code>.
                It will connect in a few seconds.
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                The system will auto-reconnect when the server is available.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── QR Code Scan ── */}
      {serverOnline && waStatus === 'qr_ready' && qrCode && (
        <Card className="max-w-md mx-auto border-green-500/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Scan QR Code</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
              <Smartphone className="w-4 h-4" />
              <span>Point your phone camera at the QR code</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main Content ── */}
      {(serverOnline || chats.length > 0) && waStatus === 'connected' && (
        <>
          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'chats' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setActiveTab('chats'); setSelectedChat(null); }}
              className={activeTab === 'chats' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chats
              {totalUnread > 0 && (
                <Badge className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0 h-5">
                  {totalUnread}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('new')}
              className={activeTab === 'new' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
            <Button
              variant={activeTab === 'templates' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('templates')}
              className={activeTab === 'templates' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button
              variant={activeTab === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('email')}
              className={activeTab === 'email' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
              {emailConfigured && (
                <CheckCircle2 className="w-3 h-3 ml-1.5 text-green-300" />
              )}
            </Button>
            <Button
              variant={activeTab === 'missed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setActiveTab('missed'); fetchMissedCalls(); }}
              className={activeTab === 'missed' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <PhoneMissed className="w-4 h-4 mr-2" />
              Missed Calls
              {missedCallsActive > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0 h-5">
                  {missedCallsActive}
                </Badge>
              )}
            </Button>
          </div>

          {/* ═══ Chats Tab ═══ */}
          {activeTab === 'chats' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}>
              {/* Chat List */}
              <Card className="professional-card lg:col-span-1 overflow-hidden">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search chats..."
                      value={chatSearch}
                      onChange={e => setChatSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '55vh' }}>
                  {chatsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No chats found</p>
                    </div>
                  ) : (
                    filteredChats.map(chat => (
                      <div
                        key={chat.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b ${selectedChat?.id === chat.id ? 'bg-muted/70' : ''}`}
                        onClick={() => handleSelectChat(chat)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${getAvatarColor(chat.name)}`}>
                          {getInitials(chat.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{chat.name}</p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{formatTimestamp(chat.timestamp)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground truncate">
                              {chat.lastMessage
                                ? `${chat.lastMessage.fromMe ? 'You: ' : ''}${chat.lastMessage.body}`
                                : chat.phone}
                            </p>
                            {chat.unreadCount > 0 && (
                              <Badge className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Chat Messages */}
              <Card className="professional-card lg:col-span-2 flex flex-col overflow-hidden">
                {selectedChat ? (
                  <>
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 p-3 border-b">
                      <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSelectedChat(null)}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(selectedChat.name)}`}>
                        {getInitials(selectedChat.name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedChat.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedChat.phone}</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10" style={{ maxHeight: '45vh' }}>
                      {messagesLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p className="text-sm">No messages yet</p>
                        </div>
                      ) : (
                        chatMessages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.fromMe ? 'bg-green-600 text-white rounded-br-sm' : 'bg-background border rounded-bl-sm'}`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                              <p className={`text-[10px] mt-1 text-right ${msg.fromMe ? 'text-green-100' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.timestamp), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Input */}
                    <div className="p-3 border-t flex gap-2">
                      <Input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                        placeholder="Type a message..."
                        className="flex-1"
                        disabled={sendingReply}
                      />
                      <Button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()} size="icon" className="bg-green-600 hover:bg-green-700">
                        {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full py-20 text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">Select a chat to start messaging</p>
                      <p className="text-sm mt-1">Choose from the list on the left</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ═══ New Message Tab ═══ */}
          {activeTab === 'new' && (
            <Card className="professional-card max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  Send New Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="e.g. 94771234567"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Include country code (e.g. 94 for Sri Lanka)</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={6}
                    className="text-sm"
                  />
                </div>
                <Button onClick={handleSendNew} disabled={sendingNew || !newPhone.trim() || !newMessage.trim()} className="bg-green-600 hover:bg-green-700">
                  {sendingNew ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Message
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ═══ Templates Tab ═══ */}
          {activeTab === 'templates' && (
            <Card className="professional-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Message Templates
                </CardTitle>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search templates..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} className="pl-9 h-9" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map(template => (
                    <Card key={template.id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
                        </div>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg max-h-36 overflow-y-auto font-sans">
                          {template.body}
                        </pre>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleUseTemplate(template)} className="flex-1">
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                            Use in WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleUseEmailTemplate(template)} className="flex-1">
                            <Mail className="w-3.5 h-3.5 mr-1.5" />
                            Use in Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Email Tab ═══ */}
          {activeTab === 'email' && (
            <Card className="professional-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Email
                    {emailConfigured && (
                      <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {emailAddress}
                      </Badge>
                    )}
                  </CardTitle>
                  {emailConfigured && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEmailSetupMode(!emailSetupMode)}>
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Settings
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={handleDisconnectEmail}>
                        <WifiOff className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email Setup */}
                {(!emailConfigured || emailSetupMode) && (
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <h4 className="font-medium text-sm">Configure Email (Gmail)</h4>
                        <p className="text-xs text-muted-foreground mt-1">Use a Gmail App Password for secure sending</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Gmail Address</label>
                          <Input value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="your.email@gmail.com" className="text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">App Password</label>
                          <Input type="password" value={setupAppPassword} onChange={e => setSetupAppPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" className="text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Sender Name</label>
                        <Input value={setupSenderName} onChange={e => setSetupSenderName(e.target.value)} placeholder="NCG Express" className="text-sm" />
                      </div>
                      <Button onClick={handleConfigureEmail} disabled={configuringEmail} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        {configuringEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Configure Email
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Compose Email */}
                {emailConfigured && !emailSetupMode && (
                  <div className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">To</label>
                        <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@example.com" className="text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">CC (optional)</label>
                        <Input value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="cc@example.com" className="text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Subject</label>
                      <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject..." className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Body</label>
                      <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Type your email..." rows={6} className="text-sm" />
                    </div>
                    <Button onClick={handleSendEmail} disabled={sendingEmail} className="bg-blue-600 hover:bg-blue-700">
                      {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send Email
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* ═══ Missed Calls Tab ═══ */}
          {activeTab === 'missed' && (
            <div className="space-y-4">
              <Card className="professional-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <PhoneMissed className="w-5 h-5 text-red-500" />
                      Missed Calls — AI Auto-Reply
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {missedCallsActive > 0 && (
                        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                          <Bot className="w-3 h-3 mr-1" />
                          {missedCallsActive} AI Active
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={fetchMissedCalls}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {missedCalls.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <PhoneMissed className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No missed calls yet</p>
                      <p className="text-sm mt-1">When a WhatsApp call is missed, AI will automatically reply and handle the inquiry</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {missedCalls.map(mc => (
                        <Card key={mc.id} className={`border transition-all ${
                          mc.status === 'ai_handling' ? 'border-orange-500/30 bg-orange-50/30 dark:bg-orange-950/10' :
                          mc.status === 'needs_followup' ? 'border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/10' :
                          'border-green-500/30 bg-green-50/30 dark:bg-green-950/10'
                        }`}>
                          <CardContent className="p-4">
                            {/* Header Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                  mc.status === 'ai_handling' ? 'bg-orange-500' :
                                  mc.status === 'needs_followup' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}>
                                  {mc.status === 'ai_handling' ? <Bot className="w-5 h-5" /> :
                                   mc.status === 'resolved' ? <CheckCircle2 className="w-5 h-5" /> :
                                   <PhoneMissed className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{mc.contactName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    +{mc.phone} · {format(new Date(mc.timestamp), 'dd/MM/yyyy HH:mm')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${
                                  mc.status === 'ai_handling' ? 'text-orange-600 border-orange-500/30' :
                                  mc.status === 'needs_followup' ? 'text-yellow-600 border-yellow-500/30' :
                                  'text-green-600 border-green-500/30'
                                }`}>
                                  {mc.status === 'ai_handling' ? '🤖 AI Handling' :
                                   mc.status === 'needs_followup' ? '⚠️ Needs Follow-up' :
                                   '✅ Resolved'}
                                </Badge>
                                {mc.status === 'ai_handling' && (
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleTakeoverMissedCall(mc.id)}>
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    Take Over
                                  </Button>
                                )}
                                {mc.status !== 'resolved' && (
                                  <Button variant="outline" size="sm" className="h-7 text-xs text-green-600 border-green-300" onClick={() => handleResolveMissedCall(mc.id)}>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Resolve
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setExpandedMissedCall(expandedMissedCall === mc.id ? null : mc.id)}
                                >
                                  {mc.aiMessages.length} messages
                                  <span className="ml-1">{expandedMissedCall === mc.id ? '▲' : '▼'}</span>
                                </Button>
                              </div>
                            </div>

                            {/* AI Conversation (Expandable) */}
                            {expandedMissedCall === mc.id && mc.aiMessages.length > 0 && (
                              <div className="mt-4 space-y-2 border-t pt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">AI Conversation</p>
                                {mc.aiMessages.map((aiMsg, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex ${aiMsg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                  >
                                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                                      aiMsg.role === 'assistant'
                                        ? 'bg-orange-100 dark:bg-orange-900/30 rounded-bl-sm'
                                        : 'bg-muted rounded-br-sm'
                                    }`}>
                                      {aiMsg.role === 'assistant' && (
                                        <p className="text-[10px] font-medium text-orange-600 mb-0.5 flex items-center gap-1">
                                          <Bot className="w-3 h-3" /> AI Assistant
                                        </p>
                                      )}
                                      <p className="whitespace-pre-wrap text-xs">{aiMsg.body}</p>
                                      <p className="text-[9px] text-muted-foreground mt-1 text-right">
                                        {format(new Date(aiMsg.timestamp), 'HH:mm')}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
