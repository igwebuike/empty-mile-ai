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
  Admin: ['home','ai','loads','drivers','hire','documents','messages','map','settings'],
  Dispatcher: ['home','ai','loads','drivers','hire','documents','messages','map','settings'],
  Driver: ['home','hire','ai','documents','messages','map','settings'],
  Broker: ['home','loads','hire','documents','messages','settings']
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
    ['hire',Users,'Hire Board'], ['documents',FolderOpen,'Documents'], ['messages',MessageSquare,'Messages'], ['map',MapPin,'Live Map'], ['settings',Settings,'Settings']
  ].filter(([key])=>rolePermissions[user.role]?.includes(key));
  return <aside className="sidebar">
    <div className="logo"><div className="icon"><Bot/></div><div><h3>EMPTY MILE AI</h3><p>AI-native TMS</p></div></div>
    <div className="workspace"><Building2 size={18}/><div><b>{user.company}</b><span>{user.role} · {user.market}</span></div></div>
    <nav>{items.map(([key,Icon,label])=><button key={key} className={view===key?'active':''} onClick={()=>setView(key)}><Icon size={18}/>{label}</button>)}</nav>
    <div className="system-card"><span className="green-dot"/> <b>System Ready</b><p>Gemini, maps, Resend, Twilio and docs modules are connected or safely mocked.</p></div>
    <button className="logout" onClick={onLogout}><LogOut size={17}/>Logout</button>
  </aside>
}

function Header({user, onVoice, listening, onLogout}){
  return <header className="topbar">
    <button className="menu"><Home size={18}/></button>
    <button className={classNames('voice-command',listening && 'listening')} onClick={onVoice}>
      {listening?<Loader2 className="spin"/>:<Mic/>}
      <div><b>{listening?'Listening...':'Talk to Empty Mile AI'}</b><span>Say: Truck 104 is empty in Houston, find Dallas return load</span></div>
      <div className="wave"><i/><i/><i/><i/><i/><i/></div>
    </button>
    <button className="round"><Bell size={18}/><em>3</em></button>
    <div className="profile"><UserRound size={19}/><div><b>{user.name}</b><span>{user.role}</span></div></div>
    <button className="top-logout" onClick={onLogout} title="Logout"><LogOut size={18}/> Logout</button>
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
      <button onClick={()=>setView('hire')}><Users/><b>Hire Driver / List Truck</b><span>CDL, non-CDL and truck-owner marketplace</span></button>
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


function DriversPage(){ const drivers=[['James Carter','TX-104','Available','CDL valid'],['Maria Lopez','TX-107','In Transit','POD due'],['Chris Brown','TX-112','Off Duty','Medical expires soon']]; return <div className="page"><section className="panel big"><div className="panel-head"><div><h2>Drivers & Fleet</h2><p>Operational driver roster. Use Hire Board to source CDL/non-CDL drivers and trucks.</p></div><button><Plus/> Add Driver</button></div><div className="table">{drivers.map(d=><div className="table-row" key={d[0]}><div><b>{d[0]}</b><span>{d[1]}</span></div><span className="badge">{d[2]}</span><span>{d[3]}</span><button>Open</button></div>)}</div></section></div> }

const seedDrivers = [
  {id:'DRV-201', name:'Marcus Hill', type:'CDL-A', city:'Dallas, TX', score:96, points:1240, reviews:18, experience:'8 yrs', equipment:'Dry Van, Reefer', status:'Verified', rate:'$350/day'},
  {id:'DRV-202', name:'Angela Reed', type:'Non-CDL', city:'Houston, TX', score:91, points:880, reviews:11, experience:'4 yrs', equipment:'26ft Box Truck', status:'Verified', rate:'$220/day'},
  {id:'DRV-203', name:'Samuel Price', type:'CDL-B', city:'Atlanta, GA', score:88, points:740, reviews:9, experience:'5 yrs', equipment:'Straight Truck, Box Truck', status:'Background Pending', rate:'$260/day'}
];
const seedTrucksForHire = [
  {id:'TRK-H101', owner:'Lone Star Box Trucks', type:'26ft Box Truck', city:'Houston, TX', availability:'Available tomorrow', rate:'$650/day', driverNeeded:'Yes', verified:true},
  {id:'TRK-H102', owner:'DFW Independent Fleet', type:'53ft Dry Van + Tractor', city:'Dallas, TX', availability:'Available now', rate:'$1,150/day', driverNeeded:'Optional', verified:true},
  {id:'TRK-H103', owner:'Peach State Logistics', type:'26ft Reefer Box Truck', city:'Atlanta, GA', availability:'Weekdays', rate:'$775/day', driverNeeded:'Yes', verified:false}
];
const seedReviews = [
  {employer:'BlueLine Dispatch', driver:'Marcus Hill', rating:5, points:120, note:'On time, clean POD, excellent communication.'},
  {employer:'Metro Retail Supply', driver:'Angela Reed', rating:5, points:90, note:'Handled 26ft box truck local route professionally.'},
  {employer:'Verified Carrier Ops', driver:'Samuel Price', rating:4, points:65, note:'Good driver, needs faster status updates.'}
];


function HireMarketplace(){
  const [mode,setMode]=useState('drivers');
  const [drivers,setDrivers]=useState(seedDrivers);
  const [trucks,setTrucks]=useState(seedTrucksForHire);
  const [reviews,setReviews]=useState(seedReviews);
  const [toast,setToast]=useState('');
  const [marketSearch,setMarketSearch]=useState('');
  const [driverFilter,setDriverFilter]=useState('All Drivers');
  const [truckFilter,setTruckFilter]=useState('All Trucks');
  const [cityFilter,setCityFilter]=useState('All Markets');
  const [driverForm,setDriverForm]=useState({
    postType:'Hire Driver', license:'CDL-A', city:'Houston, TX', experience:'2+ years', equipment:'Dry Van', pay:'$300/day', schedule:'OTR / Regional', employer:'Demo Logistics LLC', phone:'', notes:'Clean MVR, on-time communication, able to upload POD from mobile.'
  });
  const [truckForm,setTruckForm]=useState({
    postType:'List Truck For Hire', owner:'Independent Truck Owner', truckType:'26ft Box Truck', city:'Houston, TX', availability:'Available now', rate:'$650/day', driverNeeded:'Optional', capacity:'10,000 lbs', notes:'Liftgate, pallet jack, local/regional work preferred.'
  });
  const [reviewForm,setReviewForm]=useState({
    employer:'Verified Employer', driver:'Marcus Hill', rating:'5', points:'75', note:'Reliable completed load. On time pickup, clean POD, good communication.'
  });
  const [backgroundPackages,setBackgroundPackages]=useState([]);
  const [backgroundChecks,setBackgroundChecks]=useState([]);
  const [backgroundForm,setBackgroundForm]=useState({
    subject:'Marcus Hill', subject_type:'Driver', package_code:'driver_cdl_annual', provider:'Auto-select best available partner'
  });

  useEffect(()=>{
    api('/api/hiring/drivers').then(setDrivers).catch(()=>{});
    api('/api/hiring/trucks').then(setTrucks).catch(()=>{});
    api('/api/hiring/reviews').then(setReviews).catch(()=>{});
    api('/api/background/packages').then(setBackgroundPackages).catch(()=>{});
    api('/api/background/checks').then(setBackgroundChecks).catch(()=>{});
  },[]);

  const markets=['All Markets','Houston, TX','Dallas, TX','Atlanta, GA','Chicago, IL','Memphis, TN','Phoenix, AZ','Los Angeles, CA'];
  const driverTypes=['All Drivers','CDL-A','CDL-B','Non-CDL','Box Truck Driver','Yard Driver','Team Driver','Local Driver','OTR Driver'];
  const truckTypes=['All Trucks','26ft Box Truck','24ft Box Truck','16ft Box Truck','Cargo Van','53ft Dry Van + Tractor','Reefer','Flatbed','Power Only','Hotshot'];
  const equipmentTypes=['Dry Van','Reefer','Flatbed','Box Truck','Power Only','Hotshot','Cargo Van','Step Deck'];
  const tabs=[['drivers','Hire / Find Drivers'],['trucks','Hire / List Trucks'],['background','Paid Verification'],['reviews','Reviews + Points'],['leaderboard','Top Reputation']];

  const normalized=(v)=>String(v||'').toLowerCase();
  const searchPass=(row)=>!marketSearch || JSON.stringify(row).toLowerCase().includes(marketSearch.toLowerCase());
  const cityPass=(city)=>cityFilter==='All Markets' || city===cityFilter;
  const filteredDrivers=drivers.filter(d=>searchPass(d)&&cityPass(d.city)&&(driverFilter==='All Drivers'||normalized(d.type).includes(normalized(driverFilter))||normalized(d.equipment).includes(normalized(driverFilter))));
  const filteredTrucks=trucks.filter(t=>searchPass(t)&&cityPass(t.city)&&(truckFilter==='All Trucks'||normalized(t.type).includes(normalized(truckFilter))));
  const topDrivers=[...drivers].sort((a,b)=>(b.points||0)-(a.points||0)).slice(0,5);
  const topCarriers=[
    {name:'BlueLine Dispatch', score:98, reviews:42, specialty:'Texas lanes · verified employer'},
    {name:'Metro Retail Supply', score:95, reviews:31, specialty:'Box truck routes · fast payments'},
    {name:'DFW Independent Fleet', score:93, reviews:26, specialty:'Owner-operator friendly'},
  ];
  const topDispatchers=[
    {name:'Eugene Dispatch Desk', score:97, reviews:38, specialty:'Empty-mile recovery'},
    {name:'Houston Night Ops', score:94, reviews:29, specialty:'After-hours dispatch'},
    {name:'Atlanta Freight Desk', score:91, reviews:20, specialty:'Regional dry van'},
  ];

  async function postDriverNeed(kind=driverForm.postType){
    const type = driverForm.license==='Non-CDL' ? 'Non-CDL' : driverForm.license;
    const payload={
      name: kind==='Driver Available' ? `${driverForm.license} Driver Available` : `${driverForm.license} Driver Needed`,
      type, city:driverForm.city, experience:driverForm.experience, equipment:driverForm.equipment,
      rate:driverForm.pay, status:kind==='Driver Available'?'Available':'Hiring', notes:driverForm.notes
    };
    try{ const row=await api('/api/hiring/drivers',{method:'POST',body:JSON.stringify(payload)}); setDrivers([row,...drivers]); }
    catch{ setDrivers([{id:`REQ-${Date.now()}`,score:0,points:0,reviews:0,...payload},...drivers]); }
    setToast(`${payload.name} posted in ${payload.city}.`); setMode('drivers');
  }
  async function listTruck(){
    const payload={owner:truckForm.owner,type:truckForm.truckType,city:truckForm.city,availability:truckForm.availability,rate:truckForm.rate,driverNeeded:truckForm.driverNeeded,capacity:truckForm.capacity,notes:truckForm.notes};
    try{ const row=await api('/api/hiring/trucks',{method:'POST',body:JSON.stringify(payload)}); setTrucks([row,...trucks]); }
    catch{ setTrucks([{id:`TRK-${Date.now()}`,verified:false,...payload},...trucks]); }
    setToast(`${payload.type} listed for hire in ${payload.city}.`); setMode('trucks');
  }
  async function addReview(driver){
    const payload={...reviewForm, driver:driver?.name || reviewForm.driver, rating:Number(reviewForm.rating), points:Number(reviewForm.points)};
    try{ const row=await api('/api/hiring/reviews',{method:'POST',body:JSON.stringify(payload)}); setReviews([row,...reviews]); }
    catch{ setReviews([payload,...reviews]); }
    setDrivers(drivers.map(d=>d.name===payload.driver?{...d,points:Number(d.points||0)+Number(payload.points||0),reviews:Number(d.reviews||0)+1,score:Math.min(100,Number(d.score||80)+1)}:d));
    setToast(`Verified review added for ${payload.driver}. +${payload.points} points.`); setMode('reviews');
  }

  async function requestBackgroundCheck(){
    const payload={...backgroundForm};
    try{ const row=await api('/api/background/checks',{method:'POST',body:JSON.stringify(payload)}); setBackgroundChecks([row,...backgroundChecks]); setToast(`Verification created for ${row.subject}. Payment required: $${row.price}/year.`); }
    catch{ const row={id:`BG-${Date.now()}`, subject:payload.subject, subject_type:payload.subject_type, package:'Annual Verification', provider:payload.provider, price:59, status:'Payment Required', renewal:'Annual', paid:false, checks:['Identity','MVR','Criminal','Employment History']}; setBackgroundChecks([row,...backgroundChecks]); setToast(`Verification created for ${row.subject}. Payment required.`); }
    setMode('background');
  }
  async function markPaid(check){
    try{ const row=await api(`/api/background/checks/${check.id}/mark-paid`,{method:'POST'}); setBackgroundChecks(backgroundChecks.map(c=>c.id===check.id?row:c)); setToast(`${row.subject} payment captured. Third-party verification started.`); }
    catch{ setBackgroundChecks(backgroundChecks.map(c=>c.id===check.id?{...c,paid:true,status:'Processing with Third Party',payment_note:'Payment captured. Verification started.'}:c)); }
  }
  async function renewCheck(check){
    try{ const row=await api(`/api/background/checks/${check.id}/renew`,{method:'POST'}); setBackgroundChecks(backgroundChecks.map(c=>c.id===check.id?row:c)); setToast(`${row.subject} annual renewal requested.`); }
    catch{ setBackgroundChecks(backgroundChecks.map(c=>c.id===check.id?{...c,paid:false,status:'Renewal Payment Required',expires_at:null}:c)); }
  }

  return <div className="page hire-page">
    <section className="panel big marketplace-hero">
      <div><p className="eyebrow">Marketplace</p><h2>Drivers, Trucks, Verification & Reputation</h2><p>Hire CDL/non-CDL drivers, list trucks, verify applicants through paid third-party background checks, renew verification yearly, and let verified employers review drivers so good drivers build points and credibility.</p></div>
      <div className="hero-actions"><button className="primary" onClick={()=>{setMode('drivers');setDriverForm({...driverForm,postType:'Hire Driver',license:'CDL-A'})}}><Users/> Hire CDL Driver</button><button className="secondary" onClick={()=>{setMode('drivers');setDriverForm({...driverForm,postType:'Hire Driver',license:'Non-CDL'})}}><UserRound/> Hire Non-CDL Driver</button><button onClick={()=>setMode('trucks')}><Truck/> List Truck</button><button onClick={()=>setMode('background')}><ShieldCheck/> Get Verified</button></div>
    </section>
    {toast&&<div className="toast">{toast}</div>}

    <section className="panel market-controls">
      <div className="control-row">
        <label><Search size={16}/> Search marketplace<input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="driver, city, truck, employer..."/></label>
        <label>Market<select value={cityFilter} onChange={e=>setCityFilter(e.target.value)}>{markets.map(m=><option key={m}>{m}</option>)}</select></label>
        <label>Driver Type<select value={driverFilter} onChange={e=>setDriverFilter(e.target.value)}>{driverTypes.map(m=><option key={m}>{m}</option>)}</select></label>
        <label>Truck Type<select value={truckFilter} onChange={e=>setTruckFilter(e.target.value)}>{truckTypes.map(m=><option key={m}>{m}</option>)}</select></label>
      </div>
      <div className="market-tabs">{tabs.map(([k,label])=><button key={k} className={mode===k?'active':''} onClick={()=>setMode(k)}>{label}</button>)}</div>
    </section>

    {mode==='drivers'&&<>
      <section className="panel marketplace-form"><div className="panel-head"><div><h3>Post Driver Need / Driver Availability</h3><p>Use dropdowns so dispatchers and drivers can post quickly without confusion.</p></div><button className="primary" onClick={()=>postDriverNeed()}><Plus/> Post</button></div>
        <div className="settings-grid market-form-grid">
          <label>Post Type<select value={driverForm.postType} onChange={e=>setDriverForm({...driverForm,postType:e.target.value})}><option>Hire Driver</option><option>Driver Available</option><option>Find Team Driver</option><option>Temporary Driver Needed</option></select></label>
          <label>License / Driver Type<select value={driverForm.license} onChange={e=>setDriverForm({...driverForm,license:e.target.value})}>{driverTypes.filter(x=>x!=='All Drivers').map(m=><option key={m}>{m}</option>)}</select></label>
          <label>Market<select value={driverForm.city} onChange={e=>setDriverForm({...driverForm,city:e.target.value})}>{markets.filter(x=>x!=='All Markets').map(m=><option key={m}>{m}</option>)}</select></label>
          <label>Equipment<select value={driverForm.equipment} onChange={e=>setDriverForm({...driverForm,equipment:e.target.value})}>{equipmentTypes.map(m=><option key={m}>{m}</option>)}</select></label>
          <label>Experience<select value={driverForm.experience} onChange={e=>setDriverForm({...driverForm,experience:e.target.value})}><option>Entry Level</option><option>1+ year</option><option>2+ years</option><option>5+ years</option><option>10+ years</option></select></label>
          <label>Pay / Rate<select value={driverForm.pay} onChange={e=>setDriverForm({...driverForm,pay:e.target.value})}><option>$180/day</option><option>$220/day</option><option>$300/day</option><option>$350/day</option><option>$0.60/mile</option><option>$0.75/mile</option><option>Negotiable</option></select></label>
          <label>Schedule<select value={driverForm.schedule} onChange={e=>setDriverForm({...driverForm,schedule:e.target.value})}><option>Local</option><option>Regional</option><option>OTR / Regional</option><option>Night Shift</option><option>Weekend</option><option>Temporary</option></select></label>
          <label>Verified Employer<input value={driverForm.employer} onChange={e=>setDriverForm({...driverForm,employer:e.target.value})}/></label>
        </div>
        <label className="wide-label">Notes<textarea value={driverForm.notes} onChange={e=>setDriverForm({...driverForm,notes:e.target.value})}/></label>
      </section>
      <div className="market-grid">{filteredDrivers.map(d=><article className="market-card" key={d.id}><div className="market-score">{d.score || 'NEW'}</div><h3>{d.name}</h3><p>{d.type} · {d.city}</p><div className="market-meta"><span>{d.experience}</span><span>{d.equipment}</span><span>{d.rate}</span></div><div className="points"><ShieldCheck/> {d.status} · {d.points} pts · {d.reviews} reviews</div><div className="btn-row"><button className="primary"><Phone/> Contact</button><button><MessageSquare/> Message</button><button onClick={()=>{setBackgroundForm({...backgroundForm,subject:d.name,subject_type:'Driver',package_code:d.type==='Non-CDL'?'driver_non_cdl_annual':'driver_cdl_annual'});setMode('background')}}><ShieldCheck/> Verify</button><button onClick={()=>addReview(d)}><CheckCircle2/> Review</button></div></article>)}</div>
    </>}

    {mode==='trucks'&&<>
      <section className="panel marketplace-form"><div className="panel-head"><div><h3>List Truck / Find Truck Owner</h3><p>Independent truck owners can list 26ft trucks, cargo vans, tractors, reefers, and larger equipment.</p></div><button className="primary" onClick={listTruck}><Truck/> List Truck</button></div>
        <div className="settings-grid market-form-grid">
          <label>Post Type<select value={truckForm.postType} onChange={e=>setTruckForm({...truckForm,postType:e.target.value})}><option>List Truck For Hire</option><option>Hire Truck</option><option>Find Owner Operator</option><option>Need Driver For My Truck</option></select></label>
          <label>Truck Type<select value={truckForm.truckType} onChange={e=>setTruckForm({...truckForm,truckType:e.target.value})}>{truckTypes.filter(x=>x!=='All Trucks').map(m=><option key={m}>{m}</option>)}</select></label>
          <label>Market<select value={truckForm.city} onChange={e=>setTruckForm({...truckForm,city:e.target.value})}>{markets.filter(x=>x!=='All Markets').map(m=><option key={m}>{m}</option>)}</select></label>
          <label>Availability<select value={truckForm.availability} onChange={e=>setTruckForm({...truckForm,availability:e.target.value})}><option>Available now</option><option>Available tomorrow</option><option>Weekdays</option><option>Weekends</option><option>Dedicated route only</option><option>On demand</option></select></label>
          <label>Rate<select value={truckForm.rate} onChange={e=>setTruckForm({...truckForm,rate:e.target.value})}><option>$350/day</option><option>$500/day</option><option>$650/day</option><option>$775/day</option><option>$1,150/day</option><option>Negotiable</option></select></label>
          <label>Driver Needed?<select value={truckForm.driverNeeded} onChange={e=>setTruckForm({...truckForm,driverNeeded:e.target.value})}><option>Yes</option><option>No</option><option>Optional</option><option>Owner drives</option></select></label>
          <label>Capacity<select value={truckForm.capacity} onChange={e=>setTruckForm({...truckForm,capacity:e.target.value})}><option>3,500 lbs</option><option>6,000 lbs</option><option>10,000 lbs</option><option>26,000 lbs</option><option>Full truckload</option></select></label>
          <label>Owner / Company<input value={truckForm.owner} onChange={e=>setTruckForm({...truckForm,owner:e.target.value})}/></label>
        </div>
        <label className="wide-label">Notes<textarea value={truckForm.notes} onChange={e=>setTruckForm({...truckForm,notes:e.target.value})}/></label>
      </section>
      <div className="market-grid">{filteredTrucks.map(t=><article className="market-card" key={t.id}><div className="truck-badge"><Truck/> {t.type}</div><h3>{t.owner}</h3><p>{t.city} · {t.availability}</p><div className="market-meta"><span>{t.rate}</span><span>Driver needed: {t.driverNeeded}</span><span>{t.verified?'Verified owner':'Needs verification'}</span><span>{t.capacity || 'Capacity TBD'}</span></div><div className="btn-row"><button className="primary"><Mail/> Request Truck</button><button><MessageSquare/> Message</button><button><Phone/> Call Owner</button></div></article>)}</div>
    </>}

    {mode==='background'&&<>
      <section className="panel big marketplace-form"><div className="panel-head"><div><h3>Paid Background Check & Annual Verification</h3><p>Drivers, truck owners, and employers pay to become verified. Empty Mile AI connects them to third-party providers such as Checkr, Yardstik, HireRight, Certn, MVR services, FMCSA, CarrierOK, and insurance verification partners. Verification renews every year.</p></div><ShieldCheck/></div>
        <div className="settings-grid market-form-grid">
          <label>Who is being verified?<input value={backgroundForm.subject} onChange={e=>setBackgroundForm({...backgroundForm,subject:e.target.value})} placeholder="Driver, truck owner, or employer name"/></label>
          <label>Subject Type<select value={backgroundForm.subject_type} onChange={e=>setBackgroundForm({...backgroundForm,subject_type:e.target.value})}><option>Driver</option><option>Truck Owner</option><option>Employer</option><option>Carrier</option></select></label>
          <label>Verification Package<select value={backgroundForm.package_code} onChange={e=>setBackgroundForm({...backgroundForm,package_code:e.target.value})}>{(backgroundPackages.length?backgroundPackages:[{code:'driver_cdl_annual',name:'CDL Driver Annual Verification - $59/year'},{code:'driver_non_cdl_annual',name:'Non-CDL Driver Annual Verification - $39/year'},{code:'truck_owner_annual',name:'Truck Owner / Company Verification - $79/year'},{code:'verified_employer_annual',name:'Verified Employer Review Privilege - $99/year'}]).map(p=><option key={p.code} value={p.code}>{p.name}{p.price?` - $${p.price}/year`:''}</option>)}</select></label>
          <label>Provider Strategy<select value={backgroundForm.provider} onChange={e=>setBackgroundForm({...backgroundForm,provider:e.target.value})}><option>Auto-select best available partner</option><option>Checkr</option><option>Yardstik</option><option>HireRight</option><option>Certn</option><option>FMCSA + MVR + Insurance Verification</option><option>CarrierOK / Carrier Compliance Partner</option></select></label>
        </div>
        <div className="verification-note"><ShieldCheck/> <div><b>Revenue model:</b> applicants pay before verification starts. Verified badge expires yearly unless renewed. Verified employers must also pay annually before leaving public driver reviews.</div></div>
        <button className="primary" onClick={requestBackgroundCheck}><ShieldCheck/> Create Paid Verification Request</button>
      </section>
      <div className="market-grid">{backgroundChecks.map(c=><article className="market-card" key={c.id}><div className="market-score">{c.paid?'PAID':'$'}</div><h3>{c.subject}</h3><p>{c.subject_type} · {c.package}</p><div className="market-meta"><span>${c.price}/year</span><span>{c.status}</span><span>{c.expires_at?`Expires ${c.expires_at}`:'Annual renewal required'}</span></div><div className="points"><ShieldCheck/> Provider: {c.provider}</div><p className="small-muted">{(c.checks||[]).join(' · ')}</p><div className="btn-row"><button className="primary" onClick={()=>markPaid(c)}>{c.paid?'Open Provider':'Pay & Start'}</button><button onClick={()=>renewCheck(c)}><CalendarClock/> Renew Yearly</button><button><Mail/> Send Link</button></div></article>)}</div>
    </>}

    {mode==='reviews'&&<section className="panel big"><div className="panel-head"><div><h3>Verified Employer Reviews</h3><p>Employers review drivers after completed work. Reviews award points and create a trust score.</p></div><ShieldCheck/></div>
      <div className="settings-grid market-form-grid review-form"><label>Employer<input value={reviewForm.employer} onChange={e=>setReviewForm({...reviewForm,employer:e.target.value})}/></label><label>Driver<select value={reviewForm.driver} onChange={e=>setReviewForm({...reviewForm,driver:e.target.value})}>{drivers.map(d=><option key={d.id}>{d.name}</option>)}</select></label><label>Rating<select value={reviewForm.rating} onChange={e=>setReviewForm({...reviewForm,rating:e.target.value})}><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Points<select value={reviewForm.points} onChange={e=>setReviewForm({...reviewForm,points:e.target.value})}><option>25</option><option>50</option><option>75</option><option>100</option><option>150</option></select></label></div>
      <label className="wide-label">Review Note<textarea value={reviewForm.note} onChange={e=>setReviewForm({...reviewForm,note:e.target.value})}/></label><button className="primary" onClick={()=>addReview({name:reviewForm.driver})}><CheckCircle2/> Submit Verified Review</button>
      <div className="review-list">{reviews.map((r,i)=><div className="review-row" key={i}><div><b>{r.driver}</b><span>{r.employer}</span></div><div className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div><p>{r.note}</p><strong>+{r.points} pts</strong></div>)}</div></section>}

    {mode==='leaderboard'&&<div className="leaderboard-grid"><section className="panel big"><h3>Top Drivers</h3>{topDrivers.map((d,i)=><div className="leader-row" key={d.id}><b>#{i+1} {d.name}</b><span>{d.type} · {d.points} pts · {d.reviews} reviews</span><strong>{d.score}</strong></div>)}</section><section className="panel big"><h3>Top Carriers</h3>{topCarriers.map((c,i)=><div className="leader-row" key={c.name}><b>#{i+1} {c.name}</b><span>{c.specialty} · {c.reviews} reviews</span><strong>{c.score}</strong></div>)}</section><section className="panel big"><h3>Top Dispatchers</h3>{topDispatchers.map((d,i)=><div className="leader-row" key={d.name}><b>#{i+1} {d.name}</b><span>{d.specialty} · {d.reviews} reviews</span><strong>{d.score}</strong></div>)}</section></div>}
  </div>
}

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
    view==='hire'?<HireMarketplace/>:
    view==='loads'?<LoadsPage loads={loads}/>:
    <SettingsPage user={user} setUser={setUser}/>;
  return <div className="app-shell"><Sidebar user={user} view={view} setView={setView} onLogout={logout}/><main><Header user={user} onVoice={voiceStart} listening={listening} onLogout={logout}/>{content}</main></div>
}

function AIWrapper(props){
  const [initial,setInitial]=useState(null);
  useEffect(()=>{ const h=(e)=>setInitial(e.detail); window.addEventListener('emai-voice',h); return()=>window.removeEventListener('emai-voice',h)},[]);
  return <DispatchAI {...props} initial={initial}/>;
}

createRoot(document.getElementById('root')).render(<App/>);
