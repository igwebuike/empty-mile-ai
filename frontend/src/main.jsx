import React, {useEffect, useMemo, useRef, useState} from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './lib/api';
import './styles.css';
import {
  Activity, Bell, Bot, Box, ChevronRight, Clock, DollarSign, FileText, Fuel,
  LayoutDashboard, Mail, Map, MapPin, Menu, MessageSquare, Mic, MicOff,
  Navigation, Package, Route, Send, Settings, ShieldCheck, Sparkles, TrendingUp,
  Truck, UserRound, Volume2, X
} from 'lucide-react';

const DEFAULT_PROMPT = 'Truck 104 is empty in Houston at 9 AM tomorrow. Find the most profitable return load to Dallas.';

function money(v){return `$${Number(v||0).toLocaleString(undefined,{maximumFractionDigits:0})}`}
function pct(v){return `${Number(v||0).toFixed(0)}%`}

function StatCard({icon:Icon,label,value,delta,tone='cyan'}){
  return <div className={`statCard ${tone}`}>
    <div><p>{label}</p><h2>{value}</h2>{delta && <small>{delta}</small>}</div>
    <span className="statIcon"><Icon size={24}/></span>
  </div>
}

function SideItem({icon:Icon,label,active}){return <div className={`sideItem ${active?'active':''}`}><Icon size={19}/><span>{label}</span></div>}

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

function FleetMap({truckForm, best}){
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  useEffect(()=>{
    if(!key || !mapRef.current) return;
    const src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    const ensureScript = () => new Promise((resolve,reject)=>{
      if(window.google?.maps) return resolve();
      let script = document.querySelector(`script[src="${src}"]`);
      if(!script){ script = document.createElement('script'); script.src = src; script.async = true; script.onerror = reject; document.head.appendChild(script); }
      script.addEventListener('load', resolve, {once:true});
    });
    ensureScript().then(()=>{
      const google = window.google;
      const center = {lat:29.7604,lng:-95.3698};
      mapObj.current = new google.maps.Map(mapRef.current,{center,zoom:6,mapTypeControl:false,streetViewControl:false,fullscreenControl:false});
      const geocoder = new google.maps.Geocoder();
      const origin = `${truckForm.current_city || 'Houston'}, ${truckForm.current_state || 'TX'}`;
      const destination = `${best?.load?.destination_city || truckForm.desired_destination_city || 'Dallas'}, ${best?.load?.destination_state || truckForm.desired_destination_state || 'TX'}`;
      Promise.all([origin,destination].map(address => geocoder.geocode({address}).then(r => r.results?.[0]?.geometry?.location).catch(()=>null))).then(points=>{
        const [o,d] = points;
        if(o){ new google.maps.Marker({position:o,map:mapObj.current,label:'T',title:`Truck ${truckForm.unit_number}`}); mapObj.current.setCenter(o); }
        if(d){ new google.maps.Marker({position:d,map:mapObj.current,label:'L',title:'Recommended load destination'}); }
        if(o && d){
          new google.maps.Polyline({path:[o,d],geodesic:true,strokeOpacity:.9,strokeWeight:5,map:mapObj.current});
          const bounds = new google.maps.LatLngBounds(); bounds.extend(o); bounds.extend(d); mapObj.current.fitBounds(bounds);
        }
      });
    }).catch(()=>{});
  },[key, truckForm.current_city, truckForm.current_state, truckForm.desired_destination_city, truckForm.desired_destination_state, truckForm.unit_number, best?.load?.destination_city, best?.load?.destination_state]);
  if(key) return <div ref={mapRef} className="googleMap"></div>;
  return <div className="mapMock">
    <span className="city dallas">DALLAS</span><span className="city waco">WACO</span><span className="city austin">AUSTIN</span><span className="city houston">HOUSTON</span>
    <svg viewBox="0 0 600 420" preserveAspectRatio="none"><path d="M470 370 C420 330 410 285 390 245 C360 190 315 175 280 145 C240 110 220 70 180 40"/><circle cx="470" cy="370" r="10"/><circle cx="180" cy="40" r="10"/><circle cx="330" cy="210" r="9"/></svg>
    <div className="mapZoom"><button>+</button><button>-</button></div>
  </div>
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

function App(){
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
  useEffect(()=>{refresh().catch(console.error)},[]);

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

  async function sendBrokerEmail(){
    if(!best) return;
    setBusy(true); setSendStatus('');
    try{
      const raw = brokerEmail.replace(/^Subject:\s*.*?\n\n/s,'');
      const res = await api('/api/messages/email',{method:'POST',body:JSON.stringify({
        to: import.meta.env.VITE_DEMO_BROKER_EMAIL || 'broker@example.com',
        subject: `Interested in ${best.load.origin_city} to ${best.load.destination_city} Load`,
        body: raw
      })});
      setSendStatus(`Broker email ${res.status || 'sent'} via ${res.channel || 'email'}.`);
    }catch(err){ setSendStatus(`Broker email failed: ${err.message}`); }
    finally{ setBusy(false); }
  }

  async function sendDriverSms(){
    if(!best) return;
    setBusy(true); setSendStatus('');
    try{
      const res = await api('/api/messages/sms',{method:'POST',body:JSON.stringify({
        to: import.meta.env.VITE_DEMO_DRIVER_PHONE || '+15550100',
        body: driverMessage
      })});
      setSendStatus(`Driver SMS ${res.status || 'sent'} via ${res.channel || 'sms'}.`);
    }catch(err){ setSendStatus(`Driver SMS failed: ${err.message}`); }
    finally{ setBusy(false); }
  }

  const brokerEmail = best ? `Subject: Interested in ${best.load.origin_city} to ${best.load.destination_city} Load\n\nHi, I have a ${truckForm.trailer_type} available near ${truckForm.current_city}, ${truckForm.current_state}. Empty Mile AI ranked your ${best.load.origin_city} to ${best.load.destination_city} load as a strong fit. Please send rate confirmation, commodity, pickup address, appointment details, and detention terms.\n\nThank you.` : '';
  const driverMessage = best ? `Return load found: ${best.load.origin_city} to ${best.load.destination_city}. Rate ${money(best.load.rate)}. Est. profit ${money(best.estimated_profit)}. Pickup: ${best.load.pickup_time || 'confirming'}. Stand by for rate confirmation.` : '';

  return <div className="appShell">
    <aside className="sidebar">
      <div className="logoMark"><div className="hex"><Bot size={26}/></div><div><b>EMPTY MILE AI</b><span>AI Powered Freight Optimization</span></div></div>
      <nav>
        <SideItem icon={LayoutDashboard} label="Dashboard" active={panel==='dashboard'} />
        <SideItem icon={Sparkles} label="AI Dispatcher" />
        <SideItem icon={Package} label="Loads" />
        <SideItem icon={Truck} label="Fleet" />
        <SideItem icon={Map} label="Map" />
        <SideItem icon={Activity} label="Analytics" />
        <SideItem icon={Mail} label="Messages" />
        <SideItem icon={FileText} label="Documents" />
        <SideItem icon={Settings} label="Settings" />
      </nav>
      <div className="statusCard"><span className="greenDot"></span><b>System Status</b><p>Gemini, Maps, and dispatcher tools ready.</p><div className="miniRobot"><Bot size={34}/></div></div>
    </aside>

    <section className="mainPanel">
      <header className="topbar">
        <button className="menuBtn"><Menu size={21}/></button>
        <div className={`voicePill ${listening?'live':''}`} onClick={listening?stopVoice:startVoice}>
          <span className="micCircle">{listening?<MicOff size={25}/>:<Mic size={25}/>}</span>
          <div><b>{listening?'Listening...':'Voice Command Ready'}</b><small>{voiceSupported?'Tap and say: Truck 104 is empty in Houston, find Dallas return load':'Voice not supported in this browser'}</small></div>
          <div className="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div className="topActions"><button><Bell size={20}/><em>3</em></button><button><ShieldCheck size={20}/></button><div className="profile"><UserRound size={23}/><div><b>Dispatcher</b><small>Houston Ops</small></div></div></div>
      </header>

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
          <FleetMap truckForm={truckForm} best={best} />
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
    </section>
  </div>
}

createRoot(document.getElementById('root')).render(<App/>);
