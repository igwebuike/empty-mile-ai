import React, {useMemo, useRef, useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Bot, Mic, Send, Mail, MessageSquare, Phone, Upload, FileText, Truck, Users, MapPin,
  Package, ShieldCheck, Settings, LogOut, Building2, ClipboardList, Route, Bell, Search,
  Home, Plus, Sparkles, CalendarClock, DollarSign, Gauge, UserRound, CheckCircle2,
  AlertTriangle, Loader2, Navigation, Headphones, Paperclip, FolderOpen
} from 'lucide-react';
import './styles.css';
import {API, api} from './lib/api';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const TEST_EMAIL = import.meta.env.VITE_TEST_EMAIL || 'eugene.ebem@gmail.com';
const TEST_PHONE = import.meta.env.VITE_TEST_PHONE || '+16822437381';

const demoUser = {
  name: 'Eugene',
  email: 'eugene.ebem@gmail.com',
  role: 'Dispatcher',
  company: 'Demo Logistics LLC',
  market: 'Houston Ops',
  truck: 'TX-104'
};

const rolePermissions = {
  Admin: ['home','ai','loads','drivers','documents','messages','map','settings'],
  Dispatcher: ['home','ai','loads','drivers','documents','messages','map','settings'],
  Driver: ['home','ai','documents','messages','map','settings'],
  Broker: ['home','loads','documents','messages','settings']
};

const quickPrompts = [
  'Truck 104 is empty in Houston at 9 AM tomorrow. Find the best Dallas return load.',
  'Text the driver the top Dallas load and route summary.',
  'Email the broker asking if the Houston to Dallas load is still available.',
  'Upload my carrier packet and check which documents are missing.'
];

function classNames(...parts){ return parts.filter(Boolean).join(' '); }

function money(n){ return `$${Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:0})}`; }
function num(n){ return Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:0}); }
function cityState(city,state){ return [city,state].filter(Boolean).join(', '); }

function LoginScreen({onLogin}){
  const [mode,setMode] = useState('login');
  const [form,setForm] = useState({...demoUser, password:'demo123', fleetSize:'24', mcNumber:'MC-TEST'});
  return <div className="auth-page">
    <div className="auth-art">
      <div className="brand-mark"><Bot size={34}/></div>
      <h1>Empty Mile AI</h1>
      <p>Voice-first dispatch, documents, messaging, maps, and AI load matching for small fleets and owner-operators.</p>
      <div className="auth-pills">
        <span>AI Dispatcher</span><span>Driver App</span><span>Document Hub</span><span>SMS + Email</span>
      </div>
    </div>
    <div className="auth-card">
      <div className="switcher"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Login</button><button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Create Workspace</button></div>
      <h2>{mode==='login'?'Welcome back':'Create your logistics workspace'}</h2>
      <p className="muted">Demo-ready authentication. Replace with Supabase/Auth0/Clerk when ready.</p>
      <label>Email<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
      {mode==='signup' && <>
        <label>Company<input value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></label>
        <div className="two"><label>MC/DOT<input value={form.mcNumber} onChange={e=>setForm({...form,mcNumber:e.target.value})}/></label><label>Fleet Size<input value={form.fleetSize} onChange={e=>setForm({...form,fleetSize:e.target.value})}/></label></div>
      </>}
      <label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>Dispatcher</option><option>Driver</option><option>Admin</option><option>Broker</option></select></label>
      <button className="primary wide" onClick={()=>onLogin(form)}>{mode==='login'?'Login to Dashboard':'Create Workspace'}</button>
      <div className="auth-note"><ShieldCheck size={16}/> User context will be passed to Gemini so AI recognizes each account owner, role, company, lanes, trucks, and documents.</div>
    </div>
  </div>
}

function Sidebar({user, view, setView, onLogout}){
  const items = [
    ['home',Home,'Home'], ['ai',Sparkles,'Dispatch AI'], ['loads',Package,'Loads'], ['drivers',Users,'Drivers'],
    ['documents',FolderOpen,'Documents'], ['messages',MessageSquare,'Messages'], ['map',MapPin,'Live Map'], ['settings',Settings,'Settings']
  ].filter(([key])=>rolePermissions[user.role]?.includes(key));
  return <aside className="sidebar">
    <div className="logo"><div className="icon"><Bot/></div><div><h3>EMPTY MILE AI</h3><p>AI-native TMS</p></div></div>
    <div className="workspace"><Building2 size={18}/><div><b>{user.company}</b><span>{user.role} · {user.market}</span></div></div>
    <nav>{items.map(([key,Icon,label])=><button key={key} className={view===key?'active':''} onClick={()=>setView(key)}><Icon size={18}/>{label}</button>)}</nav>
    <div className="system-card"><span className="green-dot"/> <b>System Ready</b><p>Gemini, maps, Resend, Twilio and docs modules are connected or safely mocked.</p></div>
    <button className="logout" onClick={onLogout}><LogOut size={17}/>Logout</button>
  </aside>
}

function Header({user, onVoice, listening}){
  return <header className="topbar">
    <button className="menu"><Home size={18}/></button>
    <button className={classNames('voice-command',listening && 'listening')} onClick={onVoice}>
      {listening?<Loader2 className="spin"/>:<Mic/>}
      <div><b>{listening?'Listening...':'Talk to Empty Mile AI'}</b><span>Say: Truck 104 is empty in Houston, find Dallas return load</span></div>
      <div className="wave"><i/><i/><i/><i/><i/><i/></div>
    </button>
    <button className="round"><Bell size={18}/><em>3</em></button>
    <div className="profile"><UserRound size={19}/><div><b>{user.name}</b><span>{user.role}</span></div></div>
  </header>
}

function StatCard({title,value,sub,icon:Icon}){ return <div className="stat-card"><div><p>{title}</p><h2>{value}</h2><span>{sub}</span></div><Icon size={25}/></div> }

function HomePage({user,setView,stats,loads,documents}){
  return <div className="page home-page">
    <section className="hero-clean">
      <div><p className="eyebrow">{user.company} command center</p><h1>Good morning, {user.name}.</h1><p>What do you want Empty Mile AI to handle today?</p></div>
      <div className="hero-actions"><button className="primary" onClick={()=>setView('ai')}><Mic size={18}/> Talk to AI</button><button className="secondary" onClick={()=>setView('documents')}><Upload size={18}/> Upload Docs</button></div>
    </section>
    <div className="action-grid">
      <button onClick={()=>setView('ai')}><Sparkles/><b>Find Best Load</b><span>Voice or type a dispatch request</span></button>
      <button onClick={()=>setView('messages')}><MessageSquare/><b>Message Driver/Broker</b><span>SMS, email, call workflows</span></button>
      <button onClick={()=>setView('documents')}><FileText/><b>Manage Documents</b><span>Carrier packets, CDL, insurance</span></button>
      <button onClick={()=>setView('map')}><Navigation/><b>View Fleet Map</b><span>Routes, pickups, destinations</span></button>
    </div>
    <div className="stats-grid">
      <StatCard title="Active Trucks" value={stats.trucks || 1} sub="Fleet available" icon={Truck}/>
      <StatCard title="Available Loads" value={stats.available_loads || loads.length || 3} sub="Updated just now" icon={Package}/>
      <StatCard title="Docs Uploaded" value={documents.length} sub="Carrier packet ready" icon={FileText}/>
      <StatCard title="Recovered Revenue" value={money(stats.estimated_revenue_recovered || 12450)} sub="Projected savings" icon={DollarSign}/>
    </div>
    <section className="panel"><div className="panel-head"><h3>Today's AI Recommendations</h3><button onClick={()=>setView('ai')}>Open AI</button></div><div className="rec-list"><Recommendation loads={loads}/></div></section>
  </div>
}

function Recommendation({loads=[]}){
  const top = loads.slice(0,3);
  if(!top.length) return <p className="muted">Ask AI to generate return loads for your truck.</p>;
  return top.map((l,i)=><div className="load-row" key={l.id||i}><div><b>{i+1}. {l.shipper_name || 'Broker Load'}</b><span>{cityState(l.origin_city,l.origin_state)} → {cityState(l.destination_city,l.destination_state)}</span></div><div><b>{money(l.rate)}</b><span>{num(l.loaded_miles)} mi · {l.trailer_type}</span></div></div>)
}

function DispatchAI({user, loads, setLoads, initial}){
  const [message,setMessage] = useState('Truck 104 is empty in Houston at 9 AM tomorrow. Find the most profitable return load to Dallas.');
  const [answer,setAnswer] = useState('Ask Empty Mile AI to rank a load. It will generate a recommendation, broker email, and driver SMS.');
  const [truck,setTruck] = useState({unit_number:'TX-104',current_city:'Houston',current_state:'TX',desired_destination_city:'Dallas',desired_destination_state:'TX',trailer_type:'Dry Van',available_at:'Tomorrow 9 AM'});
  const [busy,setBusy] = useState(false);
  const [emailDraft,setEmailDraft] = useState('Ask the dispatcher to rank a load. The broker email will generate here.');
  const [smsDraft,setSmsDraft] = useState('Ask the dispatcher to rank a load. The driver message will generate here.');
  const [toast,setToast] = useState('');

  useEffect(()=>{ if(initial){ setMessage(initial); runDispatch(initial); } }, [initial]);

  async function runDispatch(input=message){
    setBusy(true); setToast('');
    try{
      const extracted = await api('/api/voice/extract',{method:'POST',body:JSON.stringify({transcript:input})});
      setTruck(extracted);
      const generated = await api('/api/loads/generate',{method:'POST',body:JSON.stringify({
        origin_city: extracted.current_city, origin_state: extracted.current_state,
        destination_city: extracted.desired_destination_city, trailer_type: extracted.trailer_type, count: 10
      })});
      setLoads(generated);
      const ai = await api('/api/ai/dispatcher',{method:'POST',body:JSON.stringify({message: extracted.prompt})});
      const text = ai.answer || `I found ${generated.length} loads from ${extracted.current_city} to ${extracted.desired_destination_city}.`;
      setAnswer(text);
      const top = generated[0];
      const broker = `Hello,\n\nWe have truck ${extracted.unit_number} available in ${extracted.current_city}, ${extracted.current_state} with ${extracted.trailer_type} equipment. Is your ${top?.origin_city || extracted.current_city} to ${top?.destination_city || extracted.desired_destination_city} load still available?\n\nRequested rate: ${money(top?.rate || 0)}\nPickup: ${top?.pickup_time || extracted.available_at}\n\nRegards,\n${user.name}\n${user.company}`;
      const sms = `Empty Mile AI: ${extracted.unit_number} best load: ${top?.origin_city || extracted.current_city} to ${top?.destination_city || extracted.desired_destination_city}, ${money(top?.rate||0)}, ${top?.trailer_type || extracted.trailer_type}. Reply YES to accept.`;
      setEmailDraft(broker); setSmsDraft(sms);
    }catch(e){ setAnswer(`I could not complete the full workflow: ${e.message}`); }
    finally{ setBusy(false); }
  }

  async function sendEmail(){
    setBusy(true); try{ const res = await api('/api/messages/email',{method:'POST',body:JSON.stringify({to:TEST_EMAIL,subject:'Empty Mile AI broker inquiry',body:emailDraft})}); setToast(`Email ${res.status} to ${TEST_EMAIL}`); }catch(e){ setToast(e.message); } finally{setBusy(false)}
  }
  async function sendSms(){
    setBusy(true); try{ const res = await api('/api/messages/sms',{method:'POST',body:JSON.stringify({to:TEST_PHONE,body:smsDraft})}); setToast(`SMS ${res.status} to ${TEST_PHONE}`); }catch(e){ setToast(e.message); } finally{setBusy(false)}
  }

  return <div className="page ai-page">
    <section className="ai-command panel big">
      <div className="panel-head"><div><h2>Ask Empty Mile AI</h2><p>One clear place to speak or type. The AI extracts truck details, generates loads, ranks them, and prepares messages.</p></div><Sparkles/></div>
      <div className="prompt-row"><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Truck 104 is empty in Houston..."/><button className="primary tall" onClick={()=>runDispatch()} disabled={busy}>{busy?<Loader2 className="spin"/>:<Send/>} Run</button></div>
      <div className="prompt-chips">{quickPrompts.map(p=><button key={p} onClick={()=>{setMessage(p);runDispatch(p)}}>{p}</button>)}</div>
      {toast && <div className="toast">{toast}</div>}
    </section>

    <div className="workflow-grid">
      <section className="panel"><h3>Recognized Truck</h3><div className="truck-summary"><b>{truck.unit_number}</b><span>{cityState(truck.current_city,truck.current_state)}</span><span>To {cityState(truck.desired_destination_city,truck.desired_destination_state)}</span><span>{truck.trailer_type}</span><span>{truck.available_at}</span></div></section>
      <section className="panel"><h3>AI Recommendation</h3><p className="ai-answer">{answer}</p></section>
    </div>

    <div className="tri-grid">
      <section className="panel"><div className="panel-head"><h3>Load Recommendations</h3><button onClick={()=>runDispatch()} disabled={busy}>Refresh</button></div><LoadCards loads={loads}/></section>
      <section className="panel"><div className="panel-head"><h3>Broker Email</h3><button onClick={sendEmail}><Mail size={15}/> Send</button></div><textarea className="draft" value={emailDraft} onChange={e=>setEmailDraft(e.target.value)}/></section>
      <section className="panel"><div className="panel-head"><h3>Driver Message</h3><div className="btn-row"><button onClick={sendSms}><MessageSquare size={15}/> SMS</button><a className="button" href={`tel:${TEST_PHONE}`}><Phone size={15}/> Call</a></div></div><textarea className="draft" value={smsDraft} onChange={e=>setSmsDraft(e.target.value)}/></section>
    </div>
  </div>
}

function LoadCards({loads}){ if(!loads?.length) return <p className="muted">No loads yet. Run the AI dispatcher.</p>; return <div className="load-cards">{loads.slice(0,6).map((l,i)=><div className="load-card" key={l.id||i}><div className="score">{Math.max(70, 98-i*4)}</div><h4>{l.shipper_name || 'Generated Load'}</h4><p>{cityState(l.origin_city,l.origin_state)} → {cityState(l.destination_city,l.destination_state)}</p><div><b>{money(l.rate)}</b><span>{num(l.loaded_miles)} mi · {l.trailer_type}</span></div></div>)}</div> }

function DocumentsPage({documents,setDocuments}){
  const [docType,setDocType] = useState('Carrier Packet');
  const [file,setFile] = useState(null);
  const [busy,setBusy]=useState(false); const [toast,setToast]=useState('');
  async function upload(){ if(!file){setToast('Choose a document first.');return;} setBusy(true); const data=new FormData(); data.append('doc_type',docType); data.append('file',file); try{ const d=await api('/api/documents/upload',{method:'POST',body:data}); setDocuments([d,...documents]); setToast(`${d.filename} uploaded and indexed.`); setFile(null); }catch(e){setToast(e.message)} finally{setBusy(false)} }
  return <div className="page docs-page">
    <section className="panel big"><div className="panel-head"><div><h2>Document Hub</h2><p>Upload carrier packets, MC authority, W9, insurance, CDL, medical cards, truck registration, POD and BOL files.</p></div><Upload/></div>
      <div className="doc-upload"><select value={docType} onChange={e=>setDocType(e.target.value)}>{['Carrier Packet','MC Authority','DOT Certificate','W9','Insurance','CDL','Medical Card','Truck Registration','Inspection','POD','BOL','Rate Confirmation'].map(x=><option key={x}>{x}</option>)}</select><label className="file-picker"><Paperclip/> {file?file.name:'Choose file'}<input type="file" onChange={e=>setFile(e.target.files?.[0])}/></label><button className="primary" onClick={upload} disabled={busy}>{busy?<Loader2 className="spin"/>:<Upload/>} Upload</button></div>{toast&&<div className="toast">{toast}</div>}</section>
    <div className="doc-grid">{['Company','Drivers','Trucks','Loads'].map((group,i)=><section className="panel" key={group}><h3>{group}</h3><div className="doc-list">{documents.filter((_,idx)=>idx%4===i).slice(0,5).map(d=><div className="doc-item" key={d.id}><FileText/><div><b>{d.doc_type}</b><span>{d.filename}</span><small>{d.parsed_summary}</small></div></div>)}{!documents.filter((_,idx)=>idx%4===i).length&&<p className="muted">No documents yet.</p>}</div></section>)}</div>
  </div>
}

function MessagesPage(){
  const [channel,setChannel]=useState('driver'); const [msg,setMsg]=useState('Truck TX-104 assigned to Houston to Dallas load. Please confirm.'); const [toast,setToast]=useState(''); const [busy,setBusy]=useState(false);
  async function send(type){ setBusy(true); try{ const path=type==='email'?'/api/messages/email':'/api/messages/sms'; const payload=type==='email'?{to:TEST_EMAIL,subject:'Empty Mile AI dispatch update',body:msg}:{to:TEST_PHONE,body:msg}; const r=await api(path,{method:'POST',body:JSON.stringify(payload)}); setToast(`${type.toUpperCase()} ${r.status}`);}catch(e){setToast(e.message)}finally{setBusy(false)} }
  return <div className="page messages-page"><section className="panel big"><div className="panel-head"><div><h2>Communication Center</h2><p>Text, email, call, and voice-note workflows for drivers, brokers, and shippers.</p></div><Headphones/></div><div className="message-layout"><aside>{['driver','broker','shipper'].map(c=><button className={channel===c?'active':''} onClick={()=>setChannel(c)} key={c}><MessageSquare/> {c[0].toUpperCase()+c.slice(1)}</button>)}</aside><main><h3>{channel} conversation</h3><div className="chat-box"><div className="bubble ai">Empty Mile AI drafted the next update.</div><div className="bubble user">Please confirm pickup and ETA.</div></div><textarea value={msg} onChange={e=>setMsg(e.target.value)}/><div className="btn-row"><button className="primary" onClick={()=>send('sms')} disabled={busy}><MessageSquare/> Send SMS</button><button onClick={()=>send('email')} disabled={busy}><Mail/> Send Email</button><a className="button" href={`tel:${TEST_PHONE}`}><Phone/> Call</a></div>{toast&&<div className="toast">{toast}</div>}</main></div></section></div>
}

function MapPage({loads}){
  const top = loads[0];
  const origin = encodeURIComponent(`${top?.origin_city || 'Houston'}, ${top?.origin_state || 'TX'}`);
  const dest = encodeURIComponent(`${top?.destination_city || 'Dallas'}, ${top?.destination_state || 'TX'}`);
  const src = GOOGLE_KEY ? `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_KEY}&origin=${origin}&destination=${dest}&mode=driving` : '';
  return <div className="page map-page"><section className="panel big"><div className="panel-head"><div><h2>Live Fleet Map</h2><p>Google Maps route layer for trucks, pickup, delivery, and deadhead mileage.</p></div><MapPin/></div>{src?<iframe title="fleet-map" className="google-map" src={src}/>:<div className="mock-map"><div className="route-line"/><span className="pin houston">Houston</span><span className="pin waco">Waco</span><span className="pin dallas">Dallas</span><p>Add VITE_GOOGLE_MAPS_API_KEY to show live Google Maps.</p></div>}</section></div>
}

function DriversPage(){ const drivers=[['James Carter','TX-104','Available','CDL valid'],['Maria Lopez','TX-107','In Transit','POD due'],['Chris Brown','TX-112','Off Duty','Medical expires soon']]; return <div className="page"><section className="panel big"><div className="panel-head"><h2>Drivers & Fleet</h2><button><Plus/> Add Driver</button></div><div className="table">{drivers.map(d=><div className="table-row" key={d[0]}><div><b>{d[0]}</b><span>{d[1]}</span></div><span className="badge">{d[2]}</span><span>{d[3]}</span><button>Open</button></div>)}</div></section></div> }
function LoadsPage({loads}){ return <div className="page"><section className="panel big"><div className="panel-head"><h2>Loads Marketplace</h2><p>Heuristic/test loads now; DAT/Truckstop later.</p></div><LoadCards loads={loads}/></section></div> }
function SettingsPage({user,setUser}){ return <div className="page"><section className="panel big"><h2>Workspace Settings</h2><div className="settings-grid"><label>Name<input value={user.name} onChange={e=>setUser({...user,name:e.target.value})}/></label><label>Company<input value={user.company} onChange={e=>setUser({...user,company:e.target.value})}/></label><label>Role<select value={user.role} onChange={e=>setUser({...user,role:e.target.value})}><option>Admin</option><option>Dispatcher</option><option>Driver</option><option>Broker</option></select></label><label>API Base<input value={API} readOnly/></label></div></section></div> }

function App(){
  const [user,setUser] = useState(()=>JSON.parse(localStorage.getItem('emai_user')||'null'));
  const [view,setView] = useState('home');
  const [stats,setStats] = useState({});
  const [loads,setLoads] = useState([]);
  const [documents,setDocuments] = useState([]);
  const [listening,setListening] = useState(false);

  useEffect(()=>{ if(user){ localStorage.setItem('emai_user',JSON.stringify(user)); loadData(); } },[user]);
  async function loadData(){ try{ const [d,l,docs]=await Promise.all([api('/api/dashboard').catch(()=>({})),api('/api/loads').catch(()=>[]),api('/api/documents').catch(()=>[])]); setStats(d); setLoads(l); setDocuments(docs); }catch{} }
  function logout(){ localStorage.removeItem('emai_user'); setUser(null); }
  function voiceStart(){
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Rec){ alert('Speech recognition is not supported in this browser. Use Chrome and allow microphone access.'); return; }
    const rec = new Rec(); rec.lang='en-US'; rec.interimResults=false; rec.continuous=false; setListening(true);
    rec.onresult = (e)=>{ const text=e.results?.[0]?.[0]?.transcript || ''; setView('ai'); setTimeout(()=>window.dispatchEvent(new CustomEvent('emai-voice',{detail:text})),100); };
    rec.onerror = ()=>setListening(false); rec.onend=()=>setListening(false); rec.start();
  }

  if(!user) return <LoginScreen onLogin={(u)=>{setUser(u);setView('home')}}/>;
  const content = view==='home'?<HomePage user={user} setView={setView} stats={stats} loads={loads} documents={documents}/>:
    view==='ai'?<AIWrapper user={user} loads={loads} setLoads={setLoads}/>:
    view==='documents'?<DocumentsPage documents={documents} setDocuments={setDocuments}/>:
    view==='messages'?<MessagesPage/>:
    view==='map'?<MapPage loads={loads}/>:
    view==='drivers'?<DriversPage/>:
    view==='loads'?<LoadsPage loads={loads}/>:
    <SettingsPage user={user} setUser={setUser}/>;
  return <div className="app-shell"><Sidebar user={user} view={view} setView={setView} onLogout={logout}/><main><Header user={user} onVoice={voiceStart} listening={listening}/>{content}</main></div>
}

function AIWrapper(props){
  const [initial,setInitial]=useState(null);
  useEffect(()=>{ const h=(e)=>setInitial(e.detail); window.addEventListener('emai-voice',h); return()=>window.removeEventListener('emai-voice',h)},[]);
  return <DispatchAI {...props} initial={initial}/>;
}

createRoot(document.getElementById('root')).render(<App/>);
