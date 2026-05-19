import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Clock, Trash2, ArrowRight, Layout, AlignJustify, Filter, Sparkles, Upload, Copy, Check, X, Loader2, Settings, BrainCircuit, MessageCircle, MoreVertical, Instagram, Zap, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyAxeqFZeu46PfTxuTqfQGtpUydcdmTQv2s",
  authDomain: "nutrition-e81fa.firebaseapp.com",
  projectId: "nutrition-e81fa",
  storageBucket: "nutrition-e81fa.firebasestorage.app",
  messagingSenderId: "1080849727060",
  appId: "1:1080849727060:web:9f99e7e7c553bfba29f7c1"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'instagram-crm-live';

const STAGES = [
  { id: 'target', title: '🎯 Target List', color: 'bg-slate-100', border: 'border-slate-200' },
  { id: 'engaging', title: '👀 Engaging', color: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'dm_sent', title: '📨 DM Sent', color: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'in_convo', title: '💬 In Convo', color: 'bg-pink-50', border: 'border-pink-200' },
  { id: 'follow_up', title: '⏰ Follow Up', color: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'closed', title: '✅ Closed/Won', color: 'bg-emerald-50', border: 'border-emerald-200' }
];

export default function App() {
  const [user, setUser] = useState(null);
  
  // Auth State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Forms & State
  const [aiPersona, setAiPersona] = useState('');
  const [brainFileError, setBrainFileError] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState({ handle: '', type: 'warm', stage: 'target', notes: '', followUpDate: '' });

  // 1. Initialize Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- AUTH FUNCTIONS ---
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (error) {
      setAuthError(error.message.replace('Firebase: ', ''));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // 2. Fetch Data (Leads & Settings)
  useEffect(() => {
    if (!user) return;

    const leadsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'leads');
    const unsubLeads = onSnapshot(leadsRef, (snapshot) => {
      const fetchedLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(fetchedLeads);
    }, (error) => console.error("Error fetching leads:", error));

    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'persona');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setAiPersona(docSnap.data().text || '');
      }
    }, (error) => console.error("Error fetching settings:", error));

    return () => {
      unsubLeads();
      unsubSettings();
    };
  }, [user]);

  // --- CRUD Operations ---
  const savePersona = async () => {
    if (!user) return;
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'persona');
      await setDoc(settingsRef, { text: aiPersona });
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Error saving persona:", error);
    }
  };

  const saveLead = async () => {
    if (!user || !formData.handle) return;
    
    const formattedHandle = formData.handle.startsWith('@') ? formData.handle : `@${formData.handle}`;
    const leadData = {
      ...formData,
      handle: formattedHandle,
      lastContact: new Date().toISOString().split('T')[0],
      avatar: formData.handle.substring(0, 2).toUpperCase().replace('@', '')
    };

    try {
      const leadsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'leads');
      if (editingLead) {
        await updateDoc(doc(leadsRef, editingLead.id), leadData);
      } else {
        await setDoc(doc(leadsRef, Date.now().toString()), leadData);
      }
      setIsLeadModalOpen(false);
    } catch (error) {
      console.error("Error saving lead:", error);
    }
  };

  const deleteLead = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'leads', id));
      setIsLeadModalOpen(false);
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const updateLeadStage = async (leadId, newStage) => {
    if (!user) return;
    try {
      const leadRef = doc(db, 'artifacts', appId, 'users', user.uid, 'leads', leadId);
      await updateDoc(leadRef, { stage: newStage });
    } catch (error) {
      console.error("Error updating stage:", error);
    }
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('leadId', id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, stageId) => {
    const leadId = e.dataTransfer.getData('leadId');
    updateLeadStage(leadId, stageId);
  };

  const moveRight = (id, currentIndex) => {
    if (currentIndex < STAGES.length - 1) {
      updateLeadStage(id, STAGES[currentIndex + 1].id);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      setScreenshot({ mimeType: file.type, base64: base64String, previewUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };
  
  const handleBrainFileUpload = async (e) => {
    setBrainFileError('');
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let newText = "";
    let hasError = false;

    for (const file of files) {
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        try {
          const text = await file.text();
          newText += `\n\n--- DOCUMENT: ${file.name} ---\n${text}`;
        } catch (err) {
          hasError = true;
        }
      } else {
        hasError = true;
      }
    }

    if (hasError) {
      setBrainFileError('Some files were ignored. Please only upload raw text files (.txt, .md, .csv).');
    }

    if (newText) {
      setAiPersona(prev => prev + newText);
    }
    e.target.value = null;
  };

  const generateAIMessage = async () => {
    if (!selectedLead) return;
    setIsGenerating(true);
    setGeneratedText('');
    setCopied(false);

    const apiKey = "AIzaSyCWJpA1p9KXJ85g0PQhIIvExBQ2UF-TDRg"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    let parts = [{ 
      text: `${aiPersona ? `You must strictly adhere to the following persona, tone, style, and context guidelines:\n"""\n${aiPersona}\n"""\n\n` : ''}
      Draft a highly engaging Instagram DM for ${selectedLead.handle}. 
      My CRM notes on them: "${selectedLead.notes || 'No specific notes'}". 
      My specific request: "${aiPrompt || 'Write a casual, friendly DM to start a conversation or continue our last chat.'}". 
      Keep it sounding human, casual, under 3 sentences, and avoid cheesy emojis. Don't use hashtags.` 
    }];

    if (screenshot) {
      parts[0].text += " I have also attached a screenshot of their profile or our last interaction. Analyze this image to personalize the message and make it hyper-relevant to their recent content or our last chat.";
      parts.push({ inlineData: { mimeType: screenshot.mimeType, data: screenshot.base64 } });
    }

    const payload = { contents: [{ role: "user", parts }] };

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate message.';
      } catch (err) {
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(retries - 1, delay * 2);
      }
    };

    try {
      const text = await fetchWithRetry();
      setGeneratedText(text);
    } catch (error) {
      setGeneratedText('Error generating message. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openLeadModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({ ...lead });
    } else {
      setEditingLead(null);
      setFormData({ handle: '', type: 'warm', stage: 'target', notes: '', followUpDate: '' });
    }
    setIsLeadModalOpen(true);
  };

  const openAiModal = (lead) => {
    setSelectedLead(lead);
    setAiPrompt('');
    setScreenshot(null);
    setGeneratedText('');
    setIsAiModalOpen(true);
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.handle.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesFilter = true;
    if (activeFilter === 'warm') matchesFilter = lead.type === 'warm';
    if (activeFilter === 'cold') matchesFilter = lead.type === 'cold';
    if (activeFilter === 'urgent') matchesFilter = lead.followUpDate && lead.followUpDate <= today;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-purple-600" size={32} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-3.5 rounded-2xl text-white shadow-sm mb-4">
              <Instagram size={36} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pipeline.ai</h1>
            <p className="text-sm font-medium text-slate-500 mt-2">Log in to your command center</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input 
                type="email" required
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-medium"
                value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Password</label>
              <input 
                type="password" required
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-medium"
                value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••"
              />
            </div>
            
            {authError && <p className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 p-3 rounded-xl">{authError}</p>}

            <button type="submit" disabled={isAuthenticating} className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md text-sm flex justify-center items-center gap-2 disabled:opacity-70">
              {isAuthenticating && <Loader2 className="animate-spin" size={16} />}
              {isSignUp ? 'Create Secure Account' : 'Sign In to Workspace'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="text-sm text-purple-600 font-bold hover:text-purple-700 transition-colors">
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-2.5 rounded-xl text-white shadow-sm">
            <Instagram size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Pipeline.ai</h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Instagram CRM</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Search handles..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 focus:bg-white transition-all text-sm"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="AI Persona Settings">
            <BrainCircuit size={20} />
          </button>
          <button onClick={() => openLeadModal()} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 hidden sm:flex items-center gap-1" title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm sticky top-[73px] z-10">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto hide-scrollbar">
          <Filter size={14} className="text-slate-400 mr-2" />
          {[
            { id: 'all', label: 'All Leads' }, { id: 'warm', label: '🔥 Warm Only' }, { id: 'cold', label: '🧊 Cold Only' }, { id: 'urgent', label: '🚨 Urgent Actions' }
          ].map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)} className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium text-xs ${activeFilter === f.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setIsCompact(false)} className={`p-1.5 rounded-md transition-all ${!isCompact ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Layout size={14} /></button>
          <button onClick={() => setIsCompact(true)} className={`p-1.5 rounded-md transition-all ${isCompact ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><AlignJustify size={14} /></button>
        </div>
      </div>

      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-h-[calc(100vh-160px)] items-start pb-8">
          {STAGES.map((stage, stageIndex) => (
            <div key={stage.id} className={`flex flex-col w-[300px] flex-shrink-0 rounded-2xl border ${stage.border} ${stage.color} bg-opacity-40 min-h-[200px] max-h-full`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)}>
              <div className="p-4 flex justify-between items-center border-b border-black/5">
                <h2 className="font-semibold text-slate-700 text-sm tracking-wide">{stage.title}</h2>
                <span className="bg-white px-2 py-0.5 rounded-md text-xs font-bold text-slate-500 shadow-sm border border-slate-100">{filteredLeads.filter(l => l.stage === stage.id).length}</span>
              </div>
              <div className="p-3 flex flex-col gap-3 overflow-y-auto">
                {filteredLeads.filter(l => l.stage === stage.id).map(lead => {
                  const isUrgent = lead.followUpDate && lead.followUpDate <= today;
                  return (
                    <div key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead.id)} className={`bg-white p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative ${isUrgent ? 'border-red-200' : 'border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-300">{lead.avatar}</div>
                          <div>
                            <a href={`https://instagram.com/${lead.handle.replace('@', '')}`} target="_blank" rel="noreferrer" className="font-bold text-slate-900 text-sm hover:text-purple-600">{lead.handle}</a>
                            <span className={`block text-[10px] uppercase font-extrabold tracking-wider mt-0.5 ${lead.type === 'warm' ? 'text-orange-500' : 'text-blue-500'}`}>{lead.type} Lead</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                          <button onClick={() => openAiModal(lead)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"><Sparkles size={14} /></button>
                          <button onClick={() => openLeadModal(lead)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"><Edit2 size={14} /></button>
                        </div>
                      </div>
                      {!isCompact && <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{lead.notes || 'No notes yet.'}</p>}
                      <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                        <div className="flex flex-col gap-1 mt-2">
                          {lead.followUpDate ? (
                            <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md ${isUrgent ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                              <Clock size={12} /><span>{isUrgent ? 'Due Today' : `Due: ${lead.followUpDate.slice(5)}`}</span>
                            </div>
                          ) : (
                             <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><MessageCircle size={12} /><span>Last: {lead.lastContact?.slice(5)}</span></div>
                          )}
                        </div>
                        {stageIndex < STAGES.length - 1 && <button onClick={() => moveRight(lead.id, stageIndex)} className="bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border border-slate-200"><ArrowRight size={14} /></button>}
                      </div>
                    </div>
                  );
                })}
                {filteredLeads.filter(l => l.stage === stage.id).length === 0 && <div className="text-center p-4 text-xs font-medium text-slate-400 border border-dashed border-slate-300 rounded-xl">Drop leads here</div>}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODALS */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-900">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h3>
              <button onClick={() => setIsLeadModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Instagram Handle</label>
                <div className="relative"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-medium">@</span><input type="text" className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white text-sm font-medium" value={formData.handle.replace('@', '')} onChange={(e) => setFormData({...formData, handle: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Lead Type</label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-medium text-slate-700" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}><option value="warm">🔥 Warm</option><option value="cold">🧊 Cold</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Stage</label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-medium text-slate-700" value={formData.stage} onChange={(e) => setFormData({...formData, stage: e.target.value})}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Follow Up Date</label>
                <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-medium text-slate-700" value={formData.followUpDate} onChange={(e) => setFormData({...formData, followUpDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Notes</label>
                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm resize-none" rows="3" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {editingLead ? <button onClick={() => deleteLead(editingLead.id)} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold border border-transparent hover:border-red-100"><Trash2 size={14} /> Delete</button> : <div></div>}
              <div className="flex gap-2">
                <button onClick={() => setIsLeadModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg font-bold transition-colors text-sm">Cancel</button>
                <button onClick={saveLead} disabled={!formData.handle} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-bold transition-colors text-sm shadow-sm">Save Lead</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAiModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 via-white to-pink-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-purple-100"><Sparkles className="text-purple-600" size={18} /></div>
                <div><h3 className="text-sm font-extrabold text-slate-900">AI Drafter</h3><p className="text-xs text-slate-500 font-medium">Drafting for {selectedLead.handle}</p></div>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">1. What's the goal?</label>
                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white transition-colors text-sm text-slate-800" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">2. Attach Context (Optional)</label>
                {!screenshot ? (
                  <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors hover:border-purple-300 cursor-pointer group">
                    <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform"><Upload className="text-purple-500" size={20} /></div>
                    <span className="text-sm text-slate-600 font-medium">Click or Drop screenshot here</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <img src={screenshot.previewUrl} className="max-h-48 object-contain" />
                    <button onClick={() => setScreenshot(null)} className="absolute top-2 right-2 bg-slate-900/80 text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors"><X size={14} /></button>
                  </div>
                )}
              </div>
              <button onClick={generateAIMessage} disabled={isGenerating} className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 disabled:opacity-70 disabled:cursor-not-allowed">
                {isGenerating ? <><Loader2 className="animate-spin" size={18} /> Drafting with Persona...</> : <><Zap size={18} /> Generate Perfect DM</>}
              </button>
              {generatedText && (
                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-purple-100 shadow-inner relative">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wide"><Sparkles size={14} /> AI Draft</div>
