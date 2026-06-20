import React, {useEffect, useMemo, useRef, useState} from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './lib/api';
import './styles.css';
import {
  Activity, Bell, Bot, Box, ChevronRight, Clock, DollarSign, FileText, Fuel,
  LayoutDashboard, Mail, Map, MapPin, Menu, MessageSquare, Mic, MicOff,
  Navigation, Package, Route, Send, Settings, ShieldCheck, Sparkles, TrendingUp,
  Truck, UserRound, Volume2, X, LogOut, ClipboardCheck, Building2
} from 'lucide-react';

const DEFAULT_PROMPT = 'Truck 104 is empty in Houston at 9 AM tomorrow. Find the most profitable return load to Dallas.';
const PUBLIC_ROLES = ['Dispatcher', 'Driver', 'Broker'];
const FACTORING_COMPANIES = [
  { name: 'Apex Capital Corp', email: 'verification@apexcapitalcorp.com' },
  { name: 'OTR Solutions', email: 'verification@otrsolutions.com' },
  { name: 'Triumph Business Capital', email: 'verification@triumphbc.com' },
  { name: 'RTS Financial', email: 'verification@rtsfinancial.com' },
  { name: 'TAFS', email: 'verification@tafs.com' },
  { name: 'eCapital', email: 'verification@ecapital.com' },
  { name: 'Riviera Finance', email: 'verification@rivierafinance.com' },
  { name: 'Porter Freight Funding', email: 'verification@porterfreightfunding.com' },
  { name: 'TBS Factoring Service', email: 'verification@tbsfactoring.com' },
  { name: 'England Carrier Services', email: 'verification@englandlogistics.com' },
  { name: 'Other / Not Listed', email: '' }
];

function money(v){return `$${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
function pct(v){return `${Number(v||0).toFixed(0)}%`}

function StatCard({icon:Icon,label,value,delta,tone='cyan'}){
  return <div className={`statCard ${tone}`}>
    <div><p>{label}</p><h2>{value}</h2>{delta && <small>{delta}</small>}</div>
    <span className="statIcon"><Icon size={24}/></span>
  </div>
}

function SideItem({icon:Icon,label,active,onClick}){return <button type="button" className={`sideItem ${active?'active':''}`} onClick={onClick}><Icon size={19}/><span>{label}</span></button>}

function MatchCard({m, i, compact=false}){
  const load = m.load || {};
  return <div className={`matchCard ${compact?'compact':''}`}>
    <div className="matchHead">
      <div className="routeLine"><MapPin size={17}/><b>{load.origin_city || 'Houston'}, {load.origin_state || 'TX'} → {load.destination_city || 'Dallas'}, {load.destination_state || 'TX'}</b></div>
      <span>{pct(m.score || 0)} Match</span>
    </div>
    <p>{load.trailer_type || 'Dry Van'} · {Number(load.weight_lbs||0).toLocaleString()} lbs · Pickup: {load.pickup_time || 'Confirm'}</p>
    <div className="loadStats">
      <div><small>Rate</small><strong>{money(load.rate)}</strong></div>
      <div><small>Deadhead</small><strong>{Number(load.deadhead_miles || m.empty_miles_saved || 0).toFixed(0)} mi</strong></div>
      <div><small>Est. Profit</small><strong>{money(m.estimated_profit)}</strong></div>
      <div><small>RPM</small><strong>${m.rate_per_mile || '0.00'}/mi</strong></div>
    </div>
    {!compact && <p className="explain">{m.explanation}</p>}
  </div>
}

function LoadTile({l}){return <div className="loadTile"><b>{l.shipper_name}</b><p>{l.origin_city}, {l.origin_state} → {l.destination_city}, {l.destination_state}</p><small>{money(l.rate)} · {Number(l.weight_lbs||0).toLocaleString()} lbs · {l.trailer_type}</small></div>}

function WorkspacePanel({panel,user,onUserUpdate,setPanel,dashboard={},loads=[],trucks=[],matches=[],onRunMatches,onAsk}){
  const [form,setForm]=useState({
    company_name:user.company_name || 'Demo Logistics LLC',
    contact_name:user.contact_name || 'Eugene Ebem',
    contact_email:user.email || 'dispatch@example.com',
    factoring_company:user.factoring_company || 'Apex Capital Corp',
    factoring_email:user.factoring_email || 'verification@apexcapitalcorp.com'
  });
  const [status,setStatus]=useState('');
  function update(k,v){setForm(prev=>({...prev,[k]:v}))}
  function changeFactoring(name){
    const f=FACTORING_COMPANIES.find(x=>x.name===name)||FACTORING_COMPANIES[0];
    setForm(prev=>({...prev,factoring_company:f.name,factoring_email:f.email}));
  }
  async function saveAndVerify(){
    setStatus('Sending one-time factoring verification email...');
    const next={...user,...form,email:form.contact_email};
    localStorage.setItem('empty_mile_user', JSON.stringify(next));
    onUserUpdate(next);
    try{
      const res=await api('/api/factoring/verify',{method:'POST',body:JSON.stringify({
        company_name:form.company_name,
        contact_name:form.contact_name,
        contact_email:form.contact_email,
        factoring_company:form.factoring_company,
        factoring_email:form.factoring_email,
        role:user.role || 'Dispatcher'
      })});
      setStatus(`Factoring verification ${res.status || 'sent'}: ${res.detail || 'Email sent or mocked.'}`);
    }catch(err){
      setStatus(`Saved locally. Verification email failed: ${err.message}`);
    }
  }
  if(panel==='factoring' || panel==='settings'){
    return <section className="workspacePanel">
      <div className="panelHero"><div><h1><Building2 size={30}/> Factoring Company Setup</h1><p>Select the carrier factoring company once. Empty Mile AI sends a verification email to confirm the relationship, NOA/remittance instructions, and dispatch workflow details.</p></div><button onClick={()=>setPanel('dashboard')}>Back to Dashboard</button></div>
      <div className="panelGrid">
        <div className="glassCard formCard">
          <h2>Company Onboarding</h2>
          <label>Company Name</label><input value={form.company_name} onChange={e=>update('company_name',e.target.value)}/>
          <label>Contact Name</label><input value={form.contact_name} onChange={e=>update('contact_name',e.target.value)}/>
          <label>Contact Email</label><input value={form.contact_email} onChange={e=>update('contact_email',e.target.value)}/>
          <label>Factoring Company</label><select value={form.factoring_company} onChange={e=>changeFactoring(e.target.value)}>{FACTORING_COMPANIES.map(f=><option key={f.name}>{f.name}</option>)}</select>
          <label>Verification Email</label><input value={form.factoring_email} onChange={e=>update('factoring_email',e.target.value)} placeholder="verification@factoringcompany.com"/>
          <button className="primaryWide" onClick={saveAndVerify}><Mail size={18}/> Save & Send Verification Email</button>
          {status && <p className="statusLine">{status}</p>}
        </div>
        <div className="glassCard">
          <h2><ClipboardCheck size={22}/> Verification Email Includes</h2>
          <ul className="checkList">
            <li>Carrier/company name and contact</li>
            <li>Selected factoring company</li>
            <li>Request to confirm active factoring relationship</li>
            <li>Request for NOA/remittance instructions</li>
            <li>Broker communication/payment workflow setup</li>
          </ul>
          <div className="noteBox"><ShieldCheck size={18}/> Admin role is not available on public login. Admin access should be created privately later from the database or an internal invite.</div>
        </div>
      </div>
    </section>
  }
  const generatedLoads = loads.length ? loads : [
    {id:'demo-1',shipper_name:'Capital City Freight',origin_city:'Houston',origin_state:'TX',destination_city:'Dallas',destination_state:'TX',rate:1450,weight_lbs:12000,trailer_type:'Dry Van'},
    {id:'demo-2',shipper_name:'Lone Star Foods',origin_city:'Houston',origin_state:'TX',destination_city:'Fort Worth',destination_state:'TX',rate:1100,weight_lbs:8000,trailer_type:'Dry Van'},
    {id:'demo-3',shipper_name:'Austin Retail Supply',origin_city:'Houston',origin_state:'TX',destination_city:'Austin',destination_state:'TX',rate:900,weight_lbs:6000,trailer_type:'Dry Van'}
  ];
  const fleetRows = trucks.length ? trucks : [
    {id:1,unit_number:'TX-104',current_city:'Houston',current_state:'TX',desired_destination_city:'Dallas',trailer_type:'Dry Van',available_at:'Tomorrow 9 AM'},
    {id:2,unit_number:'TX-107',current_city:'Austin',current_state:'TX',desired_destination_city:'Houston',trailer_type:'Reefer',available_at:'Today 4 PM'}
  ];
  const pageTitle = {
    dispatcher:'AI Dispatcher', loads:'Loads Marketplace', fleet:'Fleet', map:'Live Map', analytics:'Analytics', messages:'Messages', documents:'Documents'
  }[panel] || 'Workspace';
  const pageSub = {
    dispatcher:'Voice-first dispatch commands, Gemini recommendations, broker email drafts, and driver SMS actions.',
    loads:'Generated heuristic loads now. DAT, Truckstop, 123Loadboard, and broker feeds can plug into this same table later.',
    fleet:'Manage trucks, trailer types, current location, desired destination, and availability.',
    map:'Route view for Houston, Dallas, Austin, San Antonio, and future live fleet tracking.',
    analytics:'Revenue recovered, empty miles saved, RPM, utilization, lane profitability, and factoring performance.',
    messages:'Broker email and driver SMS workflow center powered by Resend and Twilio.',
    documents:'Upload and track CDL, insurance, W9, authority, registration, rate confirmations, POD, and factoring NOA.'
  }[panel] || 'Select a workspace section.';

  function WorkspaceContent(){
    if(panel==='dispatcher') return <div className="panelGrid three">
      <div className="glassCard"><h2><Mic size={22}/> Voice Flow</h2><p className="muted">Say: “Truck 104 is empty in Houston tomorrow morning. Find me a Dallas return load.”</p><button className="primaryWide" onClick={onAsk}><Sparkles size={18}/> Run Dispatcher Demo</button></div>
      <div className="glassCard"><h2><Bot size={22}/> Gemini Tasks</h2><ul className="checkList"><li>Extract truck details</li><li>Generate loads</li><li>Rank by profit</li><li>Draft broker email</li><li>Draft driver SMS</li></ul></div>
      <div className="glassCard"><h2><Send size={22}/> Next Action</h2><p className="muted">Use the dashboard Ask button after speaking or typing a command.</p></div>
    </div>;
    if(panel==='loads') return <div className="workspaceGridCards">{generatedLoads.map(l=><LoadTile key={l.id} l={l}/>)}</div>;
    if(panel==='fleet') return <div className="tableCard glassCard"><h2><Truck size={22}/> Active Fleet</h2><table><thead><tr><th>Unit</th><th>Location</th><th>Destination</th><th>Trailer</th><th>Available</th></tr></thead><tbody>{fleetRows.map(t=><tr key={t.id}><td>{t.unit_number}</td><td>{t.current_city}, {t.current_state}</td><td>{t.desired_destination_city || 'Any'}</td><td>{t.trailer_type}</td><td>{t.available_at || 'Now'}</td></tr>)}</tbody></table></div>;
    if(panel==='map') return <div className="panelGrid"><div className="glassCard mapCard wideMap"><h2><Map size={22}/> Fleet Route Map</h2><div className="mapMock"><span className="city dallas">DALLAS</span><span className="city waco">WACO</span><span className="city austin">AUSTIN</span><span className="city houston">HOUSTON</span><svg viewBox="0 0 600 420" preserveAspectRatio="none"><path d="M470 370 C420 330 410 285 390 245 C360 190 315 175 280 145 C240 110 220 70 180 40"/><circle cx="470" cy="370" r="10"/><circle cx="180" cy="40" r="10"/><circle cx="330" cy="210" r="9"/></svg></div></div><div className="glassCard"><h2><Route size={22}/> Route Intelligence</h2><ul className="checkList"><li>Deadhead miles</li><li>Loaded miles</li><li>ETA</li><li>Fuel estimate</li><li>Profit scoring</li></ul></div></div>;
    if(panel==='analytics') return <div className="analyticsGrid"><StatCard icon={DollarSign} label="Revenue Recovered" value={money(dashboard.estimated_revenue_recovered || 12219)} delta="From matched return loads"/><StatCard icon={Route} label="Empty Miles Saved" value={`${Number(dashboard.empty_miles_saved || 1398).toLocaleString()} mi`} delta="Estimated from matches"/><StatCard icon={TrendingUp} label="Avg Profit / Load" value="$842" delta="Heuristic scoring"/><StatCard icon={Fuel} label="Fuel Saved" value="$1,870" delta="Based on 8 MPG"/></div>;
    if(panel==='messages') return <div className="panelGrid"><div className="glassCard"><h2><Mail size={22}/> Broker Emails</h2><p className="muted">Resend sends broker inquiries, rate requests, and factoring verification emails.</p><pre>Subject: Carrier available for Houston → Dallas

Truck TX-104 is available near Houston. Please send load details, rate confirmation, pickup address, and detention terms.</pre></div><div className="glassCard"><h2><MessageSquare size={22}/> Driver SMS</h2><p className="muted">Twilio sends dispatch instructions, pickup reminders, and delivery updates.</p><pre>Return load found: Houston → Dallas. Rate $1,450. Stand by for pickup details.</pre></div></div>;
    if(panel==='documents') return <div className="workspaceGridCards">{['CDL','Insurance COI','W9','MC Authority','Registration','Rate Confirmation','Proof of Delivery','Factoring NOA'].map(x=><div className="docTile glassCard" key={x}><FileText size={28}/><b>{x}</b><p className="muted">Upload, verify, and attach to dispatch workflow.</p><button>Upload</button></div>)}</div>;
    return null;
  }
  return <section className="workspacePanel"><div className="panelHero"><div><h1>{pageTitle}</h1><p>{pageSub}</p></div><button onClick={()=>setPanel('dashboard')}>Back to Dashboard</button></div><WorkspaceContent/></section>
}


function parseVoiceToTruck(text){
  const lower = text.toLowerCase();
  const cityMatch = text.match(/(?:in|at|from)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:at|tomorrow|today|going|heading|to|with|dry|box|reefer|flatbed)|[,.]|$)/i);
  const destMatch = text.match(/(?:to|toward|back to|heading to|going to)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:at|tomorrow|today|with|dry|box|reefer|flatbed)|[,.]|$)/i);
  const unitMatch = text.match(/(?:truck|unit)\s*#?\s*([A-Z]{0,3}[- ]?\d{2,5})/i);
  let trailer = 'Dry Van';
  if(lower.includes('box truck')) trailer = 'Box Truck';
  if(lower.includes('reefer')) trailer = 'Reefer';
  if(lower.includes('flatbed')) trailer = 'Flatbed';
  if(lower.includes('power only')) trailer = 'Power Only';
  const origin = (cityMatch?.[1] || 'Houston').replace(/\s+$/,'').trim();
  const destination = (destMatch?.[1] || 'Dallas').replace(/\s+$/,'').trim();
  const unit = unitMatch?.[1]?.replace(' ','-').toUpperCase() || 'TX-104';
  return {origin, destination, unit, trailer};
}

function AuthGate({onLogin}){
  const [mode,setMode]=useState('login');
  const [form,setForm]=useState({
    email:'eugene.ebem@gmail.com',
    role:'Dispatcher',
    company_name:'Demo Logistics LLC',
    contact_name:'Eugene Ebem',
    factoring_company:'Apex Capital Corp',
    factoring_email:'verification@apexcapitalcorp.com'
  });
  const [status,setStatus]=useState('');

  function update(k,v){ setForm(prev=>({...prev,[k]:v})); }
  function changeFactoring(name){
    const f = FACTORING_COMPANIES.find(x=>x.name===name) || FACTORING_COMPANIES[0];
    setForm(prev=>({...prev,factoring_company:f.name,factoring_email:f.email}));
  }
  async function createWorkspace(){
    setStatus('Creating workspace and sending factoring verification...');
    try{
      await api('/api/factoring/verify',{method:'POST',body:JSON.stringify({
        company_name: form.company_name,
        contact_name: form.contact_name,
        contact_email: form.email,
        factoring_company: form.factoring_company,
        factoring_email: form.factoring_email,
        role: form.role
      })});
      const user={...form, workspace_created:true};
      localStorage.setItem('empty_mile_user', JSON.stringify(user));
      setStatus('Workspace created. Factoring verification email sent or mocked.');
      onLogin(user);
    }catch(err){
      setStatus(`Workspace created locally. Factoring email issue: ${err.message}`);
      const user={...form, workspace_created:true};
      localStorage.setItem('empty_mile_user', JSON.stringify(user));
      onLogin(user);
    }
  }
  function login(){
    const user={...form};
    localStorage.setItem('empty_mile_user', JSON.stringify(user));
    onLogin(user);
  }
  return <div className="authShell">
    <div className="authBrand"><div className="hex"><Bot size={30}/></div><div><b>EMPTY MILE AI</b><span>Voice-first freight intelligence</span></div></div>
    <div className="authCard">
      <div className="authTabs"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Login</button><button className={mode==='create'?'active':''} onClick={()=>setMode('create')}>Create Workspace</button></div>
      <h1>{mode==='login'?'Welcome back':'Create your company workspace'}</h1>
      <p>{mode==='login'?'Demo-ready authentication. Admin is intentionally hidden from public users.':'Choose your role and factoring company. Empty Mile AI sends a one-time verification email to the factoring company.'}</p>
      <label>Email</label><input value={form.email} onChange={e=>update('email',e.target.value)} />
      <label>Role</label><select value={form.role} onChange={e=>update('role',e.target.value)}>{PUBLIC_ROLES.map(r=><option key={r}>{r}</option>)}</select>
      {mode==='create' && <>
        <label>Company Name</label><input value={form.company_name} onChange={e=>update('company_name',e.target.value)} />
        <label>Contact Name</label><input value={form.contact_name} onChange={e=>update('contact_name',e.target.value)} />
        <label>Factoring Company</label><select value={form.factoring_company} onChange={e=>changeFactoring(e.target.value)}>{FACTORING_COMPANIES.map(f=><option key={f.name}>{f.name}</option>)}</select>
        <label>Factoring Verification Email</label><input value={form.factoring_email} onChange={e=>update('factoring_email',e.target.value)} placeholder="verification@factoringcompany.com" />
        <div className="noteBox"><ShieldCheck size={18}/> Empty Mile AI will send one verification email asking the factoring company to confirm the carrier relationship, notice of assignment, and preferred remittance instructions.</div>
      </>}
      <button className="primaryWide" onClick={mode==='login'?login:createWorkspace}>{mode==='login'?'Login to Dashboard':'Create Workspace & Verify Factoring'}</button>
      {status && <p className="statusLine">{status}</p>}
    </div>
  </div>
}

function App(){
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('empty_mile_user')||'null')}catch{return null}});
  function updateUser(next){ setUser(next); localStorage.setItem('empty_mile_user', JSON.stringify(next)); }
  function logout(){ localStorage.removeItem('empty_mile_user'); setUser(null); }
  const [dashboard,setDashboard]=useState({});
  const [trucks,setTrucks]=useState([]);
  const [loads,setLoads]=useState([]);
  const [matches,setMatches]=useState([]);
  const [message,setMessage]=useState(DEFAULT_PROMPT);
  const [answer,setAnswer]=useState('');
  const [busy,setBusy]=useState(false);
  const [listening,setListening]=useState(false);
  const [voiceSupported,setVoiceSupported]=useState(true);
  const [panel,setPanel]=useState('dashboard');
  const [sendStatus,setSendStatus]=useState('');
  const recognitionRef = useRef(null);
  const best = useMemo(()=>matches?.[0], [matches]);

  const [truckForm,setTruckForm]=useState({
    unit_number:'TX-104', truck_type:'Box Truck', trailer_type:'Dry Van', capacity_lbs:12000,
    current_city:'Houston', current_state:'TX', desired_destination_city:'Dallas', desired_destination_state:'TX',
    available_at:'Tomorrow 9 AM', mpg:8
  });

  async function refresh(){
    const [d,t,l] = await Promise.all([api('/dashboard'), api('/trucks'), api('/loads')]);
    setDashboard(d); setTrucks(t); setLoads(l);
  }
  useEffect(()=>{ if(user) refresh().catch(console.error) },[user]);

  if(!user) return <AuthGate onLogin={updateUser}/>;

  function speak(text){
    try{
      if(!('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[$]/g,' dollars '));
      u.rate = 0.95; u.pitch = 1;
      window.speechSynthesis.speak(u);
    }catch{}
  }

  async function ensureTruckAndLoads(customMessage=message){
    // 1) Save the current spoken/typed truck details
    const truck = await api('/api/trucks',{method:'POST',body:JSON.stringify({...truckForm, company_id:1})});
    // 2) Generate realistic heuristic marketplace loads for this lane
    await api('/api/loads/generate',{method:'POST',body:JSON.stringify({
      origin_city: truckForm.current_city,
      origin_state: truckForm.current_state,
      destination_city: truckForm.desired_destination_city,
      trailer_type: truckForm.trailer_type,
      count: 24
    })});
    // 3) Match, rank and ask AI for dispatcher recommendation
    const ranked = await api(`/match/${truck.id}`,{method:'POST'});
    const data = await api('/api/ai/dispatcher',{method:'POST',body:JSON.stringify({message:customMessage,truck_id:truck.id})});
    await refresh();
    return {data, ranked};
  }

  async function askDispatcher(customMessage=message){
    setBusy(true); setAnswer(''); setSendStatus('');
    try{
      const {data, ranked} = await ensureTruckAndLoads(customMessage);
      setAnswer(data.answer);
      setMatches(data.matches?.length ? data.matches : ranked || []);
      speak(data.answer);
    }catch(err){
      const msg = `AI dispatcher error: ${err.message}`;
      setAnswer(msg);
    }finally{setBusy(false)}
  }

  async function runMatches(){
    setBusy(true); setSendStatus('');
    try{
      await api('/api/loads/generate',{method:'POST',body:JSON.stringify({
        origin_city: truckForm.current_city, origin_state: truckForm.current_state,
        destination_city: truckForm.desired_destination_city, trailer_type: truckForm.trailer_type, count: 24
      })});
      let truck = trucks[0];
      if(!truck){ truck = await api('/api/trucks',{method:'POST',body:JSON.stringify({...truckForm, company_id:1})}); }
      const data = await api(`/match/${truck.id}`,{method:'POST'});
      setMatches(data || []); await refresh();
    } finally{setBusy(false)}
  }

  function startVoice(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){ setVoiceSupported(false); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false;
    recognitionRef.current = rec;
    rec.onstart = () => setListening(true);
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      try{
        const extracted = await api('/api/voice/extract',{method:'POST',body:JSON.stringify({transcript})});
        const nextForm = {...truckForm, ...extracted, truck_type:'Box Truck', capacity_lbs:12000, mpg:8};
        setTruckForm(nextForm);
        setMessage(extracted.prompt);
        await askDispatcher(extracted.prompt);
      }catch{
        const parsed = parseVoiceToTruck(transcript);
        const nextForm = {...truckForm, unit_number:parsed.unit, trailer_type:parsed.trailer, current_city:parsed.origin, desired_destination_city:parsed.destination, available_at:'Tomorrow 9 AM'};
        setTruckForm(nextForm);
        const prompt = `${transcript}\n\nUse these extracted details: truck ${parsed.unit}, current city ${parsed.origin}, destination ${parsed.destination}, trailer type ${parsed.trailer}. Rank available return loads and recommend the next dispatcher action.`;
        setMessage(prompt);
        await askDispatcher(prompt);
      }
    };
    rec.start();
  }
  function stopVoice(){ recognitionRef.current?.stop(); setListening(false); }

  async function saveVoiceTruck(){
    setBusy(true);
    try{ await api('/api/trucks',{method:'POST',body:JSON.stringify({...truckForm, company_id:1})}); await refresh(); }
    finally{ setBusy(false); }
  }

  const brokerEmail = best ? `Subject: Interested in ${best.load.origin_city} to ${best.load.destination_city} Load\n\nHi, I have a ${truckForm.trailer_type} available near ${truckForm.current_city}, ${truckForm.current_state}. Empty Mile AI ranked your ${best.load.origin_city} to ${best.load.destination_city} load as a strong fit. Please send rate confirmation, commodity, pickup address, appointment details, and detention terms.\n\nThank you.` : '';
  const driverMessage = best ? `Return load found: ${best.load.origin_city} to ${best.load.destination_city}. Rate ${money(best.load.rate)}. Est. profit ${money(best.estimated_profit)}. Pickup: ${best.load.pickup_time || 'confirming'}. Stand by for rate confirmation.` : '';

  async function sendBrokerEmail(){
    if(!brokerEmail) return;
    setBusy(true); setSendStatus('Sending broker email...');
    try{
      const to = import.meta.env.VITE_TEST_EMAIL || user.email || 'eugene.ebem@gmail.com';
      const res = await api('/api/messages/email',{method:'POST',body:JSON.stringify({to, subject:'Empty Mile AI Broker Load Inquiry', body:brokerEmail})});
      setSendStatus(`Broker email ${res.status || 'sent'} to ${to}`);
    }catch(err){ setSendStatus(`Email failed: ${err.message}`); }
    finally{ setBusy(false); }
  }
  async function sendDriverSms(){
    if(!driverMessage) return;
    setBusy(true); setSendStatus('Sending driver SMS...');
    try{
      const to = import.meta.env.VITE_TEST_PHONE || '+12145550100';
      const res = await api('/api/messages/sms',{method:'POST',body:JSON.stringify({to, body:driverMessage})});
      setSendStatus(`Driver SMS ${res.status || 'sent'} to ${to}`);
    }catch(err){ setSendStatus(`SMS failed: ${err.message}`); }
    finally{ setBusy(false); }
  }

  return <div className="appShell">
    <aside className="sidebar">
      <div className="logoMark"><div className="hex"><Bot size={26}/></div><div><b>EMPTY MILE AI</b><span>AI Powered Freight Optimization</span></div></div>
      <nav>
        <SideItem icon={LayoutDashboard} label="Dashboard" active={panel==='dashboard'} onClick={()=>setPanel('dashboard')} />
        <SideItem icon={Sparkles} label="AI Dispatcher" active={panel==='dispatcher'} onClick={()=>setPanel('dispatcher')} />
        <SideItem icon={Package} label="Loads" active={panel==='loads'} onClick={()=>setPanel('loads')} />
        <SideItem icon={Truck} label="Fleet" active={panel==='fleet'} onClick={()=>setPanel('fleet')} />
        <SideItem icon={Map} label="Map" active={panel==='map'} onClick={()=>setPanel('map')} />
        <SideItem icon={Activity} label="Analytics" active={panel==='analytics'} onClick={()=>setPanel('analytics')} />
        <SideItem icon={Mail} label="Messages" active={panel==='messages'} onClick={()=>setPanel('messages')} />
        <SideItem icon={FileText} label="Documents" active={panel==='documents'} onClick={()=>setPanel('documents')} />
        <SideItem icon={Building2} label="Factoring" active={panel==='factoring'} onClick={()=>setPanel('factoring')} />
        <SideItem icon={Settings} label="Settings" active={panel==='settings'} onClick={()=>setPanel('settings')} />
      </nav>
      <div className="statusCard"><span className="greenDot"></span><b>System Status</b><p>Gemini, Maps, email, SMS, and dispatcher tools ready.</p><small>Factoring: {user.factoring_company || 'Not selected'}</small><div className="miniRobot"><Bot size={34}/></div></div>
    </aside>

    <section className="mainPanel">
      <header className="topbar">
        <button className="menuBtn"><Menu size={21}/></button>
        <div className={`voicePill ${listening?'live':''}`} onClick={listening?stopVoice:startVoice}>
          <span className="micCircle">{listening?<MicOff size={25}/>:<Mic size={25}/>}</span>
          <div><b>{listening?'Listening...':'Voice Command Ready'}</b><small>{voiceSupported?'Tap and say: Truck 104 is empty in Houston, find Dallas return load':'Voice not supported in this browser'}</small></div>
          <div className="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div className="topActions"><button title="Notifications"><Bell size={20}/><em>3</em></button><button title="Security"><ShieldCheck size={20}/></button><div className="profile"><UserRound size={23}/><div><b>{user.role}</b><small>{user.company_name || 'Houston Ops'}</small></div></div><button className="logoutBtn" title="Logout" onClick={logout}><LogOut size={20}/><span>Logout</span></button></div>
      </header>

      {panel === 'dashboard' ? <>
      <div className="heroStrip">
        <div><h1>Welcome back, Dispatcher</h1><p>Optimize empty miles. Maximize profit. Let the AI listen, fill the truck details, and recommend the best return load.</p></div>
        <button onClick={runMatches} disabled={busy}><Sparkles size={18}/>{busy?'Working...':'Find Best Loads'}</button>
      </div>

      <section className="statGrid">
        <StatCard icon={DollarSign} label="Revenue Recovered" value={money(dashboard.estimated_revenue_recovered || 12450)} delta="+18.6% vs last 7 days" tone="green" />
        <StatCard icon={Route} label="Empty Miles Saved" value={`${Number(dashboard.empty_miles_saved || 1248).toLocaleString()} mi`} delta="+14.3% vs last 7 days" />
        <StatCard icon={Truck} label="Active Trucks" value={dashboard.trucks || 24} delta="+4 vs yesterday" tone="blue" />
        <StatCard icon={Box} label="Available Loads" value={dashboard.available_loads || 15} delta="Updated just now" />
        <StatCard icon={TrendingUp} label="Profit per Load" value="$842" delta="Avg. this week" tone="green" />
      </section>

      <section className="contentGrid">
        <div className="glassCard dispatcherCard">
          <div className="cardTitle"><h2><Sparkles size={21}/> AI Dispatcher</h2><span className="enabled">Voice Enabled</span><button onClick={()=>setAnswer('')}><X size={17}/></button></div>
          <div className="promptBox"><textarea value={message} onChange={e=>setMessage(e.target.value)} /><button onClick={()=>askDispatcher()} disabled={busy}><Send size={17}/>{busy?'Thinking...':'Ask'}</button></div>
          <div className="voiceExtract">
            <div><small>Unit</small><b>{truckForm.unit_number}</b></div><div><small>Location</small><b>{truckForm.current_city}, {truckForm.current_state}</b></div><div><small>Destination</small><b>{truckForm.desired_destination_city}, {truckForm.desired_destination_state}</b></div><div><small>Trailer</small><b>{truckForm.trailer_type}</b></div>
            <button onClick={saveVoiceTruck}>Save Truck</button>
          </div>
          {answer ? <div className="aiAnswer"><div className="avatar"><Bot size={20}/></div><div><b>I found the best return load for you.</b><p>{answer}</p>{best && <MatchCard m={best} i={0} />}</div><button className="speak" onClick={()=>speak(answer)}><Volume2 size={18}/></button></div> : <div className="emptyState"><Mic size={34}/><b>Tap the microphone and speak naturally.</b><p>Example: “Truck 104 is empty in Houston at 9 AM tomorrow. Find the best Dallas return load.”</p></div>}
        </div>

        <div className="glassCard mapCard">
          <div className="cardTitle"><h2>Live Fleet Map</h2><select><option>All Trucks</option></select></div>
          <div className="mapMock">
            <span className="city dallas">DALLAS</span><span className="city waco">WACO</span><span className="city austin">AUSTIN</span><span className="city houston">HOUSTON</span>
            <svg viewBox="0 0 600 420" preserveAspectRatio="none"><path d="M470 370 C420 330 410 285 390 245 C360 190 315 175 280 145 C240 110 220 70 180 40"/><circle cx="470" cy="370" r="10"/><circle cx="180" cy="40" r="10"/><circle cx="330" cy="210" r="9"/></svg>
            <div className="mapZoom"><button>+</button><button>-</button></div>
          </div>
        </div>

        <div className="glassCard activityCard">
          <h2>Recent Activity</h2>
          {['New load matched Houston → Dallas','Truck 107 updated location: Austin, TX','Load delivered San Antonio, TX','Rate confirmation uploaded'].map((x,i)=><div className="activity" key={x}><span>{i===0?<Package size={16}/>:i===1?<Truck size={16}/>:i===2?<ShieldCheck size={16}/>:<FileText size={16}/>}</span><p>{x}</p><small>{i===0?'2m ago':i===1?'15m ago':i===2?'1h ago':'2h ago'}</small></div>)}
        </div>
      </section>

      <section className="bottomGrid">
        <div className="glassCard"><div className="cardTitle"><h2>Top Load Recommendations</h2><button onClick={runMatches}><ChevronRight size={18}/></button></div><div className="recommendations">{matches.length ? matches.slice(0,4).map((m,i)=><MatchCard key={i} m={m} i={i} compact />) : loads.map((l)=><LoadTile key={l.id} l={l}/>)}</div></div>
        <div className="glassCard"><div className="cardTitle"><h2>Broker Email Draft</h2><button onClick={sendBrokerEmail} disabled={!brokerEmail || busy}><Mail size={17}/>Send</button></div><pre>{brokerEmail || 'Ask the dispatcher to rank a load. The broker email will generate here.'}</pre></div>
        <div className="glassCard"><div className="cardTitle"><h2>Driver Message Draft</h2><button onClick={sendDriverSms} disabled={!driverMessage || busy}><MessageSquare size={17}/>SMS</button></div><pre>{driverMessage || 'Ask the dispatcher to rank a load. The driver message will generate here.'}</pre>{sendStatus && <p className="sendStatus">{sendStatus}</p>}</div>
      </section>
      </> : <WorkspacePanel panel={panel} user={user} onUserUpdate={updateUser} setPanel={setPanel} dashboard={dashboard} loads={loads} trucks={trucks} matches={matches} onRunMatches={runMatches} onAsk={()=>askDispatcher()}/>} 
    </section>
  </div>
}

createRoot(document.getElementById('root')).render(<App/>);
