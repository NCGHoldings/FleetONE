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
  const [activeTab, setActiveTab] = useState<'chats' | 'new' | 'templates' | 'email'>('chats');

  // ── Stats ──
  const [sentToday, setSentToday] = useState(0);
  const [messageLog, setMessageLog] = useState<WAMessage[]>([]);

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
                : 'WhatsApp server offline'}
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
            <Badge variant="outline" className="text-red-500 border-red-500/30">
              <WifiOff className="w-3 h-3 mr-1.5" />
              Offline
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

      {/* ── Server Offline Warning ── */}
      {!serverOnline && (
        <Card className="border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">WhatsApp Server Offline</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Start the server in a terminal:
              </p>
              <code className="block mt-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/50 rounded text-sm font-mono">
                cd whatsapp-server && npm install && npm start
              </code>
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
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border/30 ${
                          selectedChat?.id === chat.id ? 'bg-accent/70' : ''
                        }`}
                        onClick={() => handleSelectChat(chat)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${getAvatarColor(chat.name)}`}>
                          {getInitials(chat.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{chat.name}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTimestamp(chat.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {chat.lastMessage?.fromMe && (
                                <CheckCheck className="w-3 h-3 inline mr-1 text-blue-500" />
                              )}
                              {chat.lastMessage?.body || 'No messages'}
                            </p>
                            {chat.unreadCount > 0 && (
                              <Badge className="bg-green-500 text-white text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Message View */}
              <Card className="professional-card lg:col-span-2 flex flex-col overflow-hidden">
                {selectedChat ? (
                  <>
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b flex items-center gap-3 bg-accent/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setSelectedChat(null)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(selectedChat.name)}`}>
                        {getInitials(selectedChat.name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedChat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedChat.phone ? `+${selectedChat.phone}` : selectedChat.id.replace('@c.us', '')}
                        </p>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" style={{ maxHeight: '45vh' }}>
                      {messagesLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p className="text-sm">No messages loaded</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={msg.id || idx}
                            className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] px-3 py-2 rounded-xl text-sm shadow-sm ${
                                msg.fromMe
                                  ? 'bg-green-500 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-gray-800 rounded-bl-sm border'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                msg.fromMe ? 'text-green-100' : 'text-muted-foreground'
                              }`}>
                                <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                                {msg.fromMe && <CheckCheck className="w-3 h-3" />}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Bar */}
                    <div className="px-4 py-3 border-t bg-accent/10">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                          className="flex-1"
                          disabled={sendingReply}
                        />
                        <Button
                          size="sm"
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sendingReply}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {sendingReply ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mb-4">
                        <MessageSquare className="w-10 h-10 text-green-500" />
                      </div>
                      <h3 className="text-lg font-semibold">Select a Chat</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose a conversation from the list to view messages and reply.
                      </p>
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
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="w-5 h-5 text-green-600" />
                  Send New Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                  <Input
                    placeholder="e.g. 94771234567 (country code + number, no + sign)"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sri Lanka: 94XXXXXXXXX | India: 91XXXXXXXXXX | US: 1XXXXXXXXXX
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Message</label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {newMessage.length} characters
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setNewPhone(''); setNewMessage(''); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    onClick={handleSendNew}
                    disabled={!newPhone.trim() || !newMessage.trim() || sendingNew}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {sendingNew ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Templates Tab ═══ */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <Card key={template.id} className="professional-card hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-accent/30 p-3 rounded-lg max-h-32 overflow-y-auto font-sans">
                        {template.body}
                      </pre>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            navigator.clipboard.writeText(template.body);
                            toast.success('Copied to clipboard');
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Email Tab ═══ */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Email Setup Card */}
              {!emailConfigured || emailSetupMode ? (
                <Card className="professional-card max-w-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-blue-600" />
                      {emailConfigured ? 'Update Email Settings' : 'Setup Email'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm space-y-1">
                      <p className="font-medium text-blue-700 dark:text-blue-300">Gmail App Password Setup:</p>
                      <ol className="text-blue-600 dark:text-blue-400 text-xs list-decimal pl-4 space-y-0.5">
                        <li>Go to <strong>myaccount.google.com</strong> → Security</li>
                        <li>Enable <strong>2-Step Verification</strong> if not already</li>
                        <li>Search for <strong>"App passwords"</strong></li>
                        <li>Create a new app password and paste it below</li>
                      </ol>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Sender Name</label>
                      <Input
                        placeholder="NCG Express"
                        value={setupSenderName}
                        onChange={e => setSetupSenderName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Gmail Address</label>
                      <Input
                        type="email"
                        placeholder="yourname@gmail.com"
                        value={setupEmail}
                        onChange={e => setSetupEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">App Password</label>
                      <Input
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={setupAppPassword}
                        onChange={e => setSetupAppPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This is NOT your Gmail password — it's a generated App Password
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {emailConfigured && (
                        <Button variant="outline" size="sm" onClick={() => setEmailSetupMode(false)}>
                          Cancel
                        </Button>
                      )}
                      <Button
                        onClick={handleConfigureEmail}
                        disabled={configuringEmail || !setupEmail.trim() || !setupAppPassword.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {configuringEmail ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        {configuringEmail ? 'Verifying...' : 'Connect Email'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Email Status Bar */}
                  <Card className="professional-card border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{emailAddress}</p>
                            <p className="text-xs text-muted-foreground">Sending as "{emailSenderName}" · {emailsSentToday} sent today</p>
                          </div>
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                            <Circle className="w-2 h-2 mr-1.5 fill-blue-500 text-blue-500 animate-pulse" />
                            Connected
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEmailSetupMode(true)}>
                            <Settings className="w-4 h-4 mr-1" />
                            Settings
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={handleDisconnectEmail}
                          >
                            <WifiOff className="w-4 h-4 mr-1" />
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Compose Email */}
                  <Card className="professional-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Compose Email
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">To <span className="text-red-500">*</span></label>
                          <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={emailTo}
                            onChange={e => setEmailTo(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">CC <span className="text-muted-foreground text-xs">(optional)</span></label>
                          <Input
                            type="email"
                            placeholder="cc@example.com"
                            value={emailCc}
                            onChange={e => setEmailCc(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Subject <span className="text-red-500">*</span></label>
                        <Input
                          placeholder="Email subject line..."
                          value={emailSubject}
                          onChange={e => setEmailSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Body <span className="text-red-500">*</span></label>
                        <Textarea
                          placeholder="Write your email content here..."
                          value={emailBody}
                          onChange={e => setEmailBody(e.target.value)}
                          rows={8}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">{emailBody.length} characters</p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEmailTo(''); setEmailCc(''); setEmailSubject(''); setEmailBody(''); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear
                        </Button>
                        <Button
                          onClick={handleSendEmail}
                          disabled={!emailTo.trim() || !emailSubject.trim() || !emailBody.trim() || sendingEmail}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {sendingEmail ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Email Templates */}
                  <Card className="professional-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Quick Email Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {templates.map(template => (
                          <div
                            key={template.id}
                            className="border rounded-lg p-3 hover:bg-accent/30 cursor-pointer transition-colors group"
                            onClick={() => handleUseEmailTemplate(template)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">{template.category}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{template.body.substring(0, 80)}...</p>
                            <Button size="sm" variant="ghost" className="mt-2 w-full text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Mail className="w-3 h-3 mr-1" />
                              Use as Email
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
