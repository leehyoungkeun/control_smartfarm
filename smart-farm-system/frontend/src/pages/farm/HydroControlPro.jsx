import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from 'react-router-dom';
import useConnectionMode from '../../hooks/useConnectionMode';
import useWebSocket from '../../hooks/useWebSocket';
import useSystemStore from '../../stores/systemStore';
import { configApi } from '../../api/config';
import { programsApi } from '../../api/programs';
import { controlApi } from '../../api/control';
import { alarmsApi } from '../../api/alarms';

/*
 * HYDROCONTROL PRO — Responsive (Touch Panel 1024×600 + Mobile)
 * 6 Pages: Dashboard | Flow/History | IrrModes | Valves | EC/pH | Env
 * 실시간 API/WebSocket 연동
 */

const P = {
  bg:"#050810",s0:"#0a0f1c",s1:"#0f1628",s2:"#141d34",s3:"#1a2542",
  glass:"rgba(15,22,40,.72)",glassBorder:"rgba(255,255,255,.06)",
  b0:"#182240",b1:"#223058",b2:"#2c3d70",
  cyan:"#00e5ff",cyanDim:"#00b8d4",cyanGlow:"rgba(0,229,255,.15)",
  violet:"#b388ff",violetGlow:"rgba(179,136,255,.12)",
  green:"#00e676",greenGlow:"rgba(0,230,118,.12)",
  amber:"#ffd740",amberGlow:"rgba(255,215,64,.12)",
  red:"#ff5252",redGlow:"rgba(255,82,82,.15)",
  orange:"#ffab40",teal:"#64ffda",rose:"#ff80ab",blue:"#448aff",
  t1:"#eceff8",t2:"#9eaac4",t3:"#5e6b87",t4:"#3d4a64",
  iBg:"#080d18",iB:"#1c2a4c",w:"#ffffff",
};
const FN="'Geist Mono','JetBrains Mono','SF Mono',monospace";
const FH="'Sora','Outfit',system-ui,sans-serif";

/* ═══ Responsive mode hook ═══ */
const useMode=()=>{
  const[mode,setMode]=useState(()=>window.innerWidth>=800?"tp":"mob");
  useEffect(()=>{
    const h=()=>setMode(window.innerWidth>=800?"tp":"mob");
    window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);
  },[]);
  return mode;
};

const initCSS=()=>{
  if(document.getElementById("hcp"))return;
  const el=document.createElement("style");el.id="hcp";
  el.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}:root{color-scheme:dark}
@keyframes hcFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes hcPulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes hcSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes hcShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.hcS::-webkit-scrollbar{width:3px}.hcS::-webkit-scrollbar-track{background:transparent}
.hcS::-webkit-scrollbar-thumb{background:${P.b0};border-radius:2px}
.hcI{background:${P.iBg};border:1px solid ${P.iB};color:${P.t1};font-family:${FN};
  font-size:11px;font-weight:600;padding:5px 8px;border-radius:6px;text-align:center;outline:none;transition:all .2s;width:100%}
.hcI:focus{border-color:${P.cyan};box-shadow:0 0 0 2px ${P.cyanGlow}}
.hcI::placeholder{color:${P.t4}}
.hcIs{font-size:10px;padding:4px 5px;border-radius:5px}
.hcBtn{border:none;cursor:pointer;font-family:${FH};font-weight:700;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.hcBtn:active{transform:scale(.97)}
body{background:${P.bg};overflow:hidden;-webkit-tap-highlight-color:transparent}
@media(max-width:799px){
  body{overflow:auto}
  .hcI{font-size:14px;padding:8px 10px;border-radius:8px}
}`;
  document.head.appendChild(el);
};

const r=(a,b)=>+(a+Math.random()*(b-a)).toFixed(2);
const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const sparkArr=(base,v,n=30)=>Array.from({length:n},(_,i)=>+(base+Math.sin(i/3)*v*.4+(Math.random()-.5)*v).toFixed(2));

/* COMPONENTS */
const Dot=({c,pulse,s=5})=>(
  <div style={{width:s,height:s,borderRadius:"50%",background:c,flexShrink:0,
    animation:pulse?"hcPulse 1.2s infinite":"none",boxShadow:pulse?`0 0 6px ${c}`:"none"}}/>);

const Chip=({children,c=P.cyan,soft,sm})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:3,
    padding:sm?"1px 5px":"2px 8px",borderRadius:sm?4:5,
    fontSize:sm?8:9,fontWeight:700,fontFamily:FN,letterSpacing:".03em",
    background:soft?`${c}14`:c,color:soft?c:P.bg,
    border:soft?`1px solid ${c}22`:"none"}}>{children}</span>);

const Glass=({children,style,glow})=>(
  <div style={{background:P.glass,border:`1px solid ${P.glassBorder}`,
    borderRadius:10,padding:10,backdropFilter:"blur(12px)",animation:"hcFade .3s ease",
    ...(glow?{boxShadow:`inset 0 1px 0 ${P.glassBorder}, 0 0 20px ${glow}`}:{}),...style}}>{children}</div>);

const SH=({icon,title,sub,right,c=P.cyan})=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:22,height:22,borderRadius:6,background:`${c}10`,
        border:`1px solid ${c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{icon}</div>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:P.t1,fontFamily:FH}}>{title}</div>
        {sub&&<div style={{fontSize:8,color:P.t4}}>{sub}</div>}
      </div>
    </div>
    {right}
  </div>);

const Tog=({on,onChange,c=P.green,label})=>(
  <div onClick={onChange} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}>
    {label&&<span style={{fontSize:9,color:P.t2,fontWeight:500}}>{label}</span>}
    <div style={{width:32,height:16,borderRadius:8,padding:2,background:on?c:P.s3,transition:"all .25s",boxShadow:on?`0 0 8px ${c}30`:"none"}}>
      <div style={{width:12,height:12,borderRadius:"50%",background:P.w,
        transform:on?"translateX(16px)":"translateX(0)",transition:"transform .25s cubic-bezier(.4,0,.2,1)"}}/>
    </div>
  </div>);

const Spark=({data,c,w=120,h=28,sp,fill})=>{
  if(!data?.length)return null;
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const toY=v=>h-3-((v-mn)/rng)*(h-6);
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${toY(v)}`).join(" ");
  const fillPts=`0,${h} ${pts} ${w},${h}`;
  const spY=sp!=null?toY(sp):null;
  return(
    <svg width={w} height={h} style={{display:"block",flexShrink:0,overflow:"visible"}}>
      {fill&&<polygon points={fillPts} fill={`${c}08`}/>}
      {spY!=null&&spY>0&&spY<h&&<line x1={0} y1={spY} x2={w} y2={spY} stroke={P.amber} strokeWidth=".6" strokeDasharray="3 2" opacity=".4"/>}
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={toY(data[data.length-1])} r="2" fill={c} opacity=".8">
        <animate attributeName="r" values="2;3.5;2" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>);
};

const Ring=({value,max,label,unit,c,sz=68,thick=4.5})=>{
  const rad=(sz-thick*2)/2,circ=2*Math.PI*rad;
  const pct=Math.min(1,Math.max(0,value/max));
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <div style={{position:"relative",width:sz,height:sz}}>
        <svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}>
          <circle cx={sz/2} cy={sz/2} r={rad} fill="none" stroke={P.s0} strokeWidth={thick}/>
          <circle cx={sz/2} cy={sz/2} r={rad} fill="none" stroke={c} strokeWidth={thick}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
            style={{transition:"stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)",filter:`drop-shadow(0 0 5px ${c}40)`}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:15,fontWeight:800,fontFamily:FN,color:c,lineHeight:1,textShadow:`0 0 10px ${c}25`}}>{value}</span>
          <span style={{fontSize:7,color:P.t4,fontWeight:600,marginTop:1}}>{unit}</span>
        </div>
      </div>
      <span style={{fontSize:8,fontWeight:700,color:P.t3}}>{label}</span>
    </div>);
};

const DBar=({label,value,c})=>(
  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
    <Chip c={c} sm>{label}</Chip>
    <div style={{flex:1,height:4,background:P.s0,borderRadius:2,overflow:"hidden"}}>
      <div style={{width:`${value}%`,height:"100%",borderRadius:2,background:`linear-gradient(90deg,${c}40,${c})`,transition:"width .5s"}}/>
    </div>
    <span style={{fontSize:9,fontFamily:FN,fontWeight:600,color:P.t2,width:28,textAlign:"right"}}>{value}%</span>
  </div>);

const LI=({label,value,onChange,unit,c,sm})=>(
  <div style={{display:"flex",flexDirection:"column",gap:2,flex:1}}>
    {label&&<span style={{fontSize:7,fontWeight:600,color:c||P.t4,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>}
    <div style={{position:"relative"}}>
      <input className={`hcI${sm?" hcIs":""}`} value={value} onChange={e=>onChange?.(e.target.value)} style={unit?{paddingRight:22}:{}}/>
      {unit&&<span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:8,color:P.t4,fontFamily:FN}}>{unit}</span>}
    </div>
  </div>);

const Toast=({msg,type,visible})=>(
  <div style={{position:"absolute",bottom:8,right:8,zIndex:999,padding:"7px 14px",borderRadius:7,
    background:type==="error"?P.redGlow:type==="warn"?P.amberGlow:P.greenGlow,
    border:`1px solid ${type==="error"?P.red:type==="warn"?P.amber:P.green}30`,
    color:type==="error"?P.red:type==="warn"?P.amber:P.green,
    fontSize:10,fontWeight:600,fontFamily:FH,
    transform:visible?"translateY(0)":"translateY(50px)",opacity:visible?1:0,
    transition:"all .3s",display:"flex",alignItems:"center",gap:5}}>
    <Dot c={type==="error"?P.red:type==="warn"?P.amber:P.green} pulse s={5}/>{msg}
  </div>);

const Arr=({c=P.cyan})=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
    <svg width="30" height="14" viewBox="0 0 30 14">
      <line x1="2" y1="7" x2="22" y2="7" stroke={c} strokeWidth="2" strokeDasharray="4 3" opacity=".6">
        <animate attributeName="stroke-dashoffset" values="14;0" dur="1s" repeatCount="indefinite"/></line>
      <polygon points="20,3 28,7 20,11" fill={c} opacity=".7"/>
    </svg>
  </div>);

/* ═══ 데이터 변환 헬퍼 ═══ */
const secToMMSS=(sec)=>{const m=Math.floor((sec||0)/60),s=(sec||0)%60;return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;};
const mmssToSec=(str)=>{const[m,s]=(str||'00:00').split(':').map(Number);return(m||0)*60+(s||0);};
const minToHHMM=(min)=>{const h=Math.floor((min||0)/60),m=(min||0)%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;};
const hhmmToMin=(str)=>{const[h,m]=(str||'00:00').split(':').map(Number);return(h||0)*60+(m||0);};
const litersToMl=(l)=>String(Math.round((l||0)*1000)).padStart(4,'0');
const mlToLiters=(ml)=>parseInt(ml||'0',10)/1000;
const safeNum=(v,d=2)=>{const n=Number(v);return isNaN(n)?0:+n.toFixed(d);};

const mapProgramFromApi=(p)=>{
  const tt=p.trigger_type||'solar';
  let times=[];try{times=JSON.parse(p.schedule_times||'[]');}catch{}
  times=[...times,...Array(14).fill('')].slice(0,14);
  const valves=p.valves||[];
  const vTime=Array(24).fill('00:10'),vFlow=Array(24).fill('0150');
  valves.forEach(v=>{const i=v.valve_number-1;if(i>=0&&i<24){
    vTime[i]=secToMMSS(v.duration_seconds||600);
    vFlow[i]=litersToMl(v.flow_target_liters);}});
  return{id:p.program_number,on:!!p.is_active,
    solar:{on:tt==='solar',val:p.solar_threshold||0},
    timer:{on:tt==='interval',int:minToHHMM(p.interval_minutes||30),from:'07:00',to:'22:00'},
    fixed:{on:tt==='fixed',times},vTime,vFlow,
    ec:p.set_ec||2.0,ph:p.set_ph||6.0,
    dEC:{A:p.tank_a_ratio||0,B:p.tank_b_ratio||0,C:p.tank_c_ratio||0,D:p.tank_d_ratio||0},
    dPH:{E:p.tank_e_ratio||0,F:p.tank_f_ratio||0,G:0,H:p.acid_ratio||0},
    days:(p.day_of_week||'1111111').split('').map(Number)};
};

const mapProgramToApi=(p)=>{
  let tt='solar';if(p.fixed.on)tt='fixed';if(p.timer.on)tt='interval';if(p.solar.on)tt='solar';
  return{is_active:p.on?1:0,trigger_type:tt,
    solar_threshold:parseFloat(p.solar.val)||0,
    interval_minutes:hhmmToMin(p.timer.int),
    schedule_times:JSON.stringify(p.fixed.times.filter(t=>t)),
    set_ec:parseFloat(p.ec)||2.0,set_ph:parseFloat(p.ph)||6.0,
    tank_a_ratio:p.dEC.A||0,tank_b_ratio:p.dEC.B||0,
    tank_c_ratio:p.dEC.C||0,tank_d_ratio:p.dEC.D||0,
    tank_e_ratio:p.dPH.E||0,tank_f_ratio:p.dPH.F||0,
    acid_ratio:p.dPH.H||0,day_of_week:p.days.join(''),
    valves:Array.from({length:14},(_,i)=>({
      valve_number:i+1,is_active:(p.vTime[i]&&p.vTime[i]!=='00:00')?1:0,
      duration_seconds:mmssToSec(p.vTime[i]),
      flow_target_liters:mlToLiters(p.vFlow[i])}))};
};

/* DATA */
const mkProg=id=>({
  id,on:true,
  solar:{on:id===1,val:id===1?100:0},
  timer:{on:false,int:"00:30",from:"07:00",to:"22:00"},
  fixed:{on:true,times:["08:00","09:30","11:00","12:30","14:00","15:30","17:00","","","","","","",""]},
  vTime:Array(24).fill("00:10"),vFlow:Array(24).fill("0150"),
  ec:2.0,ph:6.0,
  dEC:{A:10,B:30,C:50,D:70},dPH:{E:90,F:100,G:0,H:50},
  days:[1,1,1,1,1,1,1],
});

/* ═══════════ MAIN APP ═══════════ */
export default function HydroControlPro(){
  const { farmId } = useParams();
  const { isLocal } = useConnectionMode();
  const store = useSystemStore();
  useWebSocket(farmId);

  const M=useMode(); // "tp" or "mob"
  const mob=M==="mob";
  const[pg,setPg]=useState("dash");
  const[now,setNow]=useState(new Date());
  const[ap,setAp]=useState(0);
  const[progs,setProgs]=useState(()=>[1,2,3,4,5,6].map(mkProg));
  const[toast,setToast]=useState({msg:"",type:"ok",show:false});
  const[envTab,setEnvTab]=useState("hw");
  const[env,setEnv]=useState({auto:true,bulkEC:.5,bulkPH:.5,dbEC:.05,dbPH:.05,acid:"산",flowU:"10L",
    ahEC:4.0,ahPH:8.0,alEC:.2,alPH:4.5,olEC:.1,olPH:6.5,agOn:"00:30",agOff:"50:00",tR:0,tO:0,minS:50,
    tankCount:6,valveCount:14,
    tanks:[
      {id:"A",name:"A액 (질소·칼슘)",c:P.cyan,on:true},
      {id:"B",name:"B액 (인·칼륨·마그)",c:P.green,on:true},
      {id:"C",name:"C액 (미량원소)",c:P.violet,on:true},
      {id:"D",name:"D액 (보조영양)",c:P.amber,on:true},
      {id:"산",name:"산 (pH 하강)",c:P.red,on:true},
      {id:"F",name:"알칼리 (pH 상승)",c:P.rose,on:true},
      {id:"G",name:"미량원소2",c:P.blue,on:false},
      {id:"H",name:"킬레이트철",c:P.orange,on:false},
      {id:"I",name:"규산칼륨",c:P.teal,on:false},
      {id:"J",name:"세정제",c:P.t2,on:false},
    ]});
  const[L,setL]=useState({
    ec:0,ph:0,dEC:0,dPH:0,sol:0,tmp:0,wT:0,hum:0,co2:0,do2:0,
    av:1,pM:false,pR:false,ag:false,prg:0,dI:0,dD:0,dPct:0,onceT:0,onceF:0,iCnt:0,
    tA:0,tB:0,tAcid:0,tC:0,tD:0,
    tankLevels:[0,0,0,0,0,0,0,0,0,0],
    ecH:Array(30).fill(0),phH:Array(30).fill(0),solH:Array(30).fill(0),tmpH:Array(30).fill(0),
    sAcc:[0,0,0,0,0,0],vCnt:Array(24).fill(0),
    alarms:[],iLog:[],pHrs:{raw:0,irr:0,dA:0,dB:0,acid:0}});

  const pr=progs[ap];
  const dn=["일","월","화","수","목","금","토"];

  useEffect(()=>{initCSS();},[]);
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);

  /* ═══ API 초기 데이터 로딩 ═══ */
  useEffect(()=>{
    const load=async()=>{
      try{
        const programs=await programsApi.list(farmId);
        if(Array.isArray(programs))setProgs(programs.map(mapProgramFromApi));
      }catch(e){console.error('프로그램 로드 실패:',e);}
      try{
        const alarms=await alarmsApi.list(farmId,{limit:20});
        if(Array.isArray(alarms))setL(p=>({...p,alarms:alarms.map(a=>({
          t:a.occurred_at?new Date(a.occurred_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):'--:--',
          msg:a.message||`${a.alarm_type} (${a.alarm_value})`,
          lv:a.resolved_at?'ok':(a.alarm_type?.includes('HIGH')?'high':'warn')}))}));
      }catch(e){console.error('경보 로드 실패:',e);}
      try{
        const today=new Date().toISOString().split('T')[0];
        const summary=await configApi.dailySummary(farmId,today);
        if(summary?.summaries){
          const logs=summary.summaries.map(s=>({
            t:`PRG${s.program_number}`,v:`${s.run_count}회`,dur:'--',
            vol:safeNum(s.total_supply_liters,1).toString(),
            ec:safeNum(s.avg_ec,2).toString(),ph:safeNum(s.avg_ph,2).toString()}));
          setL(p=>({...p,iLog:logs}));
        }
      }catch(e){console.error('일일집계 로드 실패:',e);}
    };
    load();
  },[farmId]);

  /* ═══ WebSocket 실시간 업데이트 ═══ */
  useEffect(()=>{
    if(!store.status)return;
    const s=store.status;
    setL(p=>{
      const nEc=safeNum(s.current_ec??p.ec,2);
      const nPh=safeNum(s.current_ph??p.ph,2);
      const nSol=Math.round(Number(s.solar_radiation??p.sol)||0);
      const nTmp=safeNum(s.outdoor_temp??p.tmp,1);
      const nWt=safeNum(s.substrate_temp??s.water_temp??p.wT,1);
      const dTS=Number(s.daily_total_supply)||0;
      const dTD=Number(s.daily_total_drain)||0;
      return{...p,
        ec:nEc,ph:nPh,
        dEC:safeNum(s.drain_ec??p.dEC,2),dPH:safeNum(s.drain_ph??p.dPH,2),
        sol:nSol,tmp:nTmp,wT:nWt,
        hum:Math.round(Number(s.humidity??p.hum)||0),
        co2:Math.round(Number(s.co2_level??p.co2)||0),
        do2:safeNum(s.dissolved_oxygen??p.do2,1),
        pM:!!s.irrigation_pump,pR:!!s.drain_pump,ag:!!s.mixer_motor,
        prg:s.current_program||p.prg,
        av:s.current_valve||p.av,
        dI:safeNum(dTS,1),dD:safeNum(dTD,1),
        dPct:dTS>0?safeNum((dTD/dTS)*100,1):0,
        ecH:[...p.ecH.slice(1),nEc],phH:[...p.phH.slice(1),nPh],
        solH:[...p.solH.slice(1),nSol],tmpH:[...p.tmpH.slice(1),nTmp],
        tankLevels:s.latestSensors?.tankLevels||p.tankLevels,
      };
    });
    // 경보 업데이트 (WebSocket activeAlarms)
    if(store.activeAlarms?.length>0){
      setL(p=>({...p,alarms:[...store.activeAlarms.map(a=>({
        t:a.occurred_at?new Date(a.occurred_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):'--:--',
        msg:a.message||`${a.alarm_type}`,
        lv:a.alarm_type?.includes('HIGH')?'high':'warn'})),...p.alarms].slice(0,10)}));
    }
  },[store.status,store.lastUpdated]);

  const showToast=(msg,type="ok")=>{setToast({msg,type,show:true});setTimeout(()=>setToast(p=>({...p,show:false})),3000);};
  const updateProg=(fn)=>{setProgs(ps=>{const n=[...ps];n[ap]={...n[ap],...fn(n[ap])};return n;});};

  /* ═══ API 액션 핸들러 ═══ */
  const handleSaveProgram=async()=>{
    try{const pr=progs[ap];const data=mapProgramToApi(pr);
      await programsApi.update(farmId,pr.id,data);showToast('저장 완료');
    }catch(e){showToast('저장 실패: '+e.message,'error');}};

  const handleSaveConfig=async()=>{
    try{const data={set_ec:parseFloat(env.ahEC)||4.0,set_ph:parseFloat(env.ahPH)||8.0};
      await configApi.update(farmId,data);showToast('환경설정 저장');
    }catch(e){showToast('저장 실패: '+e.message,'error');}};

  const handleControl=async(label)=>{
    try{
      if(label.includes('비상정지'))await controlApi.emergencyStop(farmId);
      else if(label.includes('동작'))await controlApi.start(farmId);
      else if(label.includes('수동'))await controlApi.manual(farmId,{action:'toggle_manual'});
      else if(label.includes('일시정지'))await controlApi.stop(farmId);
      showToast(label,label.includes('비상정지')?'warn':'ok');
    }catch(e){showToast(`${label} 실패`,'error');}};

  const pages=[
    {id:"dash",icon:"📊",l:"대시보드"},{id:"flow",icon:"🔄",l:"흐름/이력"},
    {id:"prog",icon:"⚙️",l:"관수방식"},{id:"valve",icon:"🔧",l:"밸브"},{id:"dose",icon:"🧪",l:"EC/pH"},{id:"env",icon:"🛡️",l:"환경설정"}];

  const ProgSel=({small})=>(
    <div style={{display:"flex",alignItems:"center",gap:small?4:6}}>
      <span style={{fontSize:11,fontWeight:800,color:P.t1}}>PRG</span>
      {progs.map((p,i)=>(
        <div key={p.id} onClick={()=>setAp(i)} style={{width:small?28:36,height:small?28:36,borderRadius:small?6:8,
          background:i===ap?`${P.cyan}20`:P.s1,border:`1.5px solid ${i===ap?P.cyan:P.b0}`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:small?11:15,fontWeight:800,fontFamily:FN,color:i===ap?P.cyan:P.t4,cursor:"pointer"}}>{p.id}</div>))}
    </div>);

  /* ═══════════ RENDER ═══════════ */
  return(
    <div style={{background:`radial-gradient(ellipse at 20% 0%,#0a1628 0%,${P.bg} 70%)`,
      ...(mob?{width:"100vw",minHeight:"100vh"}:{width:1024,height:600}),
      fontFamily:FH,color:P.t1,display:"flex",flexDirection:"column",overflow:"hidden",
      margin:"0 auto",position:"relative"}}>

      {/* HEADER — TP: 36px top bar | MOB: sticky top */}
      <header style={{padding:mob?"0 10px":"0 12px",height:mob?48:36,display:"flex",alignItems:"center",justifyContent:"space-between",
        borderBottom:`1px solid ${P.glassBorder}`,background:`${P.s0}ee`,flexShrink:0,
        ...(mob?{position:"sticky",top:0,zIndex:100}:{})}}>
        <div style={{display:"flex",alignItems:"center",gap:mob?6:8}}>
          <div style={{width:mob?28:24,height:mob?28:24,borderRadius:6,background:`linear-gradient(135deg,#047857,${P.green})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?14:12}}>🌱</div>
          <span style={{fontSize:mob?14:12,fontWeight:800}}>HydroControl <span style={{color:P.cyan,fontSize:mob?10:9}}>PRO</span></span>
        </div>
        {/* Desktop tabs - hidden on mobile */}
        {!mob&&<nav style={{display:"flex",gap:1,background:`${P.s0}90`,borderRadius:7,padding:2,border:`1px solid ${P.glassBorder}`}}>
          {pages.map(p=>(
            <div key={p.id} onClick={()=>setPg(p.id)} style={{padding:"4px 9px",borderRadius:5,cursor:"pointer",
              background:pg===p.id?`linear-gradient(135deg,${P.cyan}20,${P.blue}15)`:"transparent",
              border:pg===p.id?`1px solid ${P.cyan}25`:"1px solid transparent",
              color:pg===p.id?P.cyan:P.t3,fontSize:9,fontWeight:700,transition:"all .15s",
              display:"flex",alignItems:"center",gap:3}}>{p.icon} {p.l}</div>))}
        </nav>}
        <div style={{display:"flex",alignItems:"center",gap:mob?6:10}}>
          <Chip c={P.green} soft><Dot c={P.green} pulse s={4}/>{mob?"":" LIVE"}</Chip>
          <span style={{fontSize:mob?13:14,fontWeight:700,fontFamily:FN,color:P.t1}}>{now.toLocaleTimeString("ko-KR",{hour12:false})}</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="hcS" style={{flex:1,overflow:"auto",padding:mob?8:5,display:"flex",flexDirection:"column",minHeight:0,
        ...(mob?{paddingBottom:64}:{})}}>

{/* ═══ PAGE: DASHBOARD ═══ */}
{pg==="dash"&&!mob&&(
<div style={{display:"grid",gridTemplateRows:"210px 1fr 42px",gap:5,animation:"hcFade .25s",height:554}}>
  {/* ═══ ROW 1: 센서 링 + 운전상태 + 관수실적 ═══ */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 240px 240px",gap:5,minHeight:0}}>
    {/* 센서 Ring 게이지 8개 */}
    <Glass style={{padding:"6px 10px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:800}}>📈 실시간 센서</span>
        <Chip c={P.cyan} soft><Dot c={P.cyan} pulse s={4}/>PRG {L.prg}</Chip></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,justifyItems:"center"}}>
        {[{label:"급액EC",value:L.ec,max:4,unit:"mS",c:P.cyan},{label:"급액pH",value:L.ph,max:10,unit:"pH",c:P.violet},
          {label:"배액EC",value:L.dEC,max:4,unit:"mS",c:P.amber},{label:"배액pH",value:L.dPH,max:10,unit:"pH",c:P.orange},
          {label:"일사량",value:L.sol,max:1200,unit:"W/m²",c:P.amber},{label:"온도",value:L.tmp,max:45,unit:"℃",c:P.red},
          {label:"습도",value:L.hum,max:100,unit:"%",c:P.teal},{label:"수온",value:L.wT,max:35,unit:"℃",c:P.blue}
        ].map((g,i)=><Ring key={i} {...g}/>)}
      </div>
    </Glass>
    {/* 운전 상태 */}
    <Glass style={{padding:"6px 10px"}}>
      <span style={{fontSize:11,fontWeight:800,display:"block",marginBottom:5}}>📋 운전 상태</span>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
        {[{l:"프로그램",v:`${L.prg}번`,c:P.cyan},{l:"상태",v:L.pM?"운전중":"정지",c:L.pM?P.green:P.red,b:1},
          {l:"밸브",v:`V${L.av}`,c:P.green},{l:"양액",v:L.pM?"작동":"정지",c:L.pM?P.green:P.t4,b:1},
          {l:"원수펌프",v:L.pR?"ON":"OFF",c:L.pR?P.cyan:P.t4,b:1},{l:"관수펌프",v:L.pM?"ON":"OFF",c:L.pM?P.green:P.t4,b:1},
          {l:"교반기",v:L.ag?"ON":"OFF",c:L.ag?P.teal:P.t4,b:1},{l:"도징",v:L.pM?"ON":"OFF",c:L.pM?P.violet:P.t4,b:1}
        ].map((row,i)=>(
          <div key={i} style={{padding:"4px 7px",borderRadius:6,background:P.s0,border:`1px solid ${P.b0}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:9,color:P.t3}}>{row.l}</span>
            {row.b?<Chip c={row.c} soft sm><Dot c={row.c} pulse={row.v==="ON"||row.v==="작동"||row.v==="운전중"} s={3}/>{row.v}</Chip>
              :<span style={{fontSize:13,fontWeight:800,fontFamily:FN,color:row.c}}>{row.v}</span>}
          </div>))}
      </div>
    </Glass>
    {/* 관수 실적 */}
    <Glass style={{padding:"6px 10px"}}>
      <span style={{fontSize:11,fontWeight:800,display:"block",marginBottom:5}}>💧 관수 실적</span>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
        {[{l:"1일관수",v:L.dI,u:"L",c:P.cyan},{l:"1일배액",v:L.dD,u:"L",c:P.amber},
          {l:"배액률",v:L.dPct,u:"%",c:P.orange},{l:"횟수",v:L.iCnt,u:"회",c:P.green},
          {l:"1회시간",v:L.onceT,u:"초",c:P.t2},{l:"1회유량",v:L.onceF,u:"L",c:P.teal},
          {l:"수온",v:L.wT,u:"℃",c:P.blue},{l:"DO",v:L.do2,u:"mg/L",c:P.violet}
        ].map((m,i)=>(
          <div key={i} style={{padding:"3px 6px",borderRadius:6,background:P.s0,border:`1px solid ${P.b0}`}}>
            <div style={{fontSize:7,color:P.t4,fontWeight:600}}>{m.l}</div>
            <span style={{fontSize:15,fontWeight:800,fontFamily:FN,color:m.c}}>{m.v}</span>
            <span style={{fontSize:8,color:P.t4,marginLeft:2}}>{m.u}</span>
          </div>))}
      </div>
    </Glass>
  </div>

  {/* ═══ ROW 2: 추이 차트 + 환경 + 경보 ═══ */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 240px 240px",gap:5,minHeight:0}}>
    {/* EC/pH 추이 그래프 */}
    <Glass style={{padding:"8px 12px",display:"flex",flexDirection:"column"}}>
      <span style={{fontSize:11,fontWeight:800,marginBottom:6}}>📈 EC / pH 추이</span>
      <div style={{display:"flex",gap:16,flex:1,alignItems:"center"}}>
        {[{l:"EC",v:L.ec,u:"mS",c:P.cyan,d:L.ecH,sp:2.0},{l:"pH",v:L.ph,u:"pH",c:P.violet,d:L.phH,sp:6.0}].map((row,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{width:55}}><div style={{fontSize:9,color:P.t4}}>{row.l}</div>
              <span style={{fontSize:24,fontWeight:800,fontFamily:FN,color:row.c,lineHeight:1}}>{row.v}</span>
              <span style={{fontSize:8,color:P.t4,marginLeft:1}}>{row.u}</span></div>
            <Spark data={row.d} c={row.c} sp={row.sp} w={180} h={45} fill/>
            <div style={{fontSize:9,color:P.t4,textAlign:"right"}}><div>설정</div><div style={{color:P.amber,fontFamily:FN,fontWeight:800,fontSize:14}}>{row.sp}</div></div>
          </div>))}
      </div>
      <div style={{height:1,background:P.b0,margin:"4px 0"}}/>
      <div style={{display:"flex",gap:16,alignItems:"center"}}>
        {[{l:"배액EC",v:L.dEC,u:"mS",c:P.amber},{l:"배액pH",v:L.dPH,u:"pH",c:P.orange}].map((r2,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:9,color:P.t3}}>{r2.l}</span>
            <span style={{fontSize:16,fontWeight:700,fontFamily:FN,color:r2.c}}>{r2.v}</span>
            <span style={{fontSize:8,color:P.t4}}>{r2.u}</span></div>))}
        <div style={{flex:1}}/>
        {[{l:"급-배 EC차",v:(L.ec-L.dEC).toFixed(2),c:P.cyan},{l:"급-배 pH차",v:(L.ph-L.dPH).toFixed(2),c:P.violet}].map((d,i)=>(
          <div key={i} style={{padding:"2px 8px",borderRadius:5,background:`${d.c}08`,border:`1px solid ${d.c}15`}}>
            <span style={{fontSize:8,color:P.t4}}>{d.l} </span>
            <span style={{fontSize:11,fontWeight:700,fontFamily:FN,color:d.c}}>{d.v}</span></div>))}
      </div>
    </Glass>
    {/* 환경 */}
    <Glass style={{padding:"6px 10px",display:"flex",flexDirection:"column"}}>
      <span style={{fontSize:11,fontWeight:800,marginBottom:5}}>🌡️ 환경</span>
      {[{l:"일사량",v:L.sol,u:"W/m²",c:P.amber,d:L.solH},{l:"온도",v:L.tmp,u:"℃",c:P.red,d:L.tmpH}].map((row,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",borderBottom:`1px solid ${P.b0}10`,marginBottom:2}}>
          <div style={{width:42}}><div style={{fontSize:8,color:P.t4}}>{row.l}</div>
            <span style={{fontSize:15,fontWeight:800,fontFamily:FN,color:row.c}}>{row.v}</span></div>
          <Spark data={row.d} c={row.c} w={120} h={24} fill/>
        </div>))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:"auto"}}>
        {[{l:"습도",v:`${L.hum}%`,c:P.teal},{l:"CO₂",v:`${L.co2}ppm`,c:P.t2},{l:"DO",v:`${L.do2}mg/L`,c:P.violet},{l:"수온",v:`${L.wT}℃`,c:P.blue}].map((row,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 5px",borderRadius:5,background:P.s0,border:`1px solid ${P.b0}`}}>
            <span style={{fontSize:9,color:P.t3}}>{row.l}</span>
            <span style={{fontSize:11,fontWeight:700,fontFamily:FN,color:row.c}}>{row.v}</span></div>))}
      </div>
    </Glass>
    {/* 경보 이력 */}
    <Glass style={{padding:"6px 10px",display:"flex",flexDirection:"column",minHeight:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:11,fontWeight:800}}>⚠️ 경보</span>
        <Chip c={P.red} soft sm>{L.alarms.filter(a=>a.lv==="high").length}건</Chip></div>
      <div style={{flex:1,overflow:"auto",minHeight:0}} className="hcS">
        {L.alarms.map((a,i)=>(<div key={i} style={{display:"flex",alignItems:"flex-start",gap:5,padding:"4px 0",borderBottom:i<L.alarms.length-1?`1px solid ${P.b0}10`:"none"}}>
          <Dot c={a.lv==="high"?P.red:a.lv==="warn"?P.amber:a.lv==="info"?P.cyan:P.green} s={6} pulse={a.lv==="high"}/>
          <div><div style={{fontSize:10,fontWeight:600,color:a.lv==="high"?P.red:a.lv==="warn"?P.amber:P.t2}}>{a.msg}</div>
            <div style={{fontSize:8,color:P.t4,fontFamily:FN}}>{a.t}</div></div></div>))}
      </div>
    </Glass>
  </div>

  {/* ═══ ROW 3: 제어 버튼 바 (42px) ═══ */}
  <Glass style={{padding:"4px 14px"}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {[{l:"🛑 비상정지",c:P.red,g:P.redGlow},{l:"▶ 동작",c:P.green,g:P.greenGlow},{l:"🔧 수동",c:P.amber,g:P.amberGlow},{l:"⏸ 일시정지",c:P.blue,g:`${P.blue}12`}].map(b=>(
        <button key={b.l} className="hcBtn" onClick={()=>handleControl(b.l)}
          style={{padding:"7px 20px",borderRadius:7,background:b.g,border:`1.5px solid ${b.c}30`,color:b.c,fontSize:11,fontWeight:800}}>{b.l}</button>))}
      <div style={{width:1,height:22,background:P.b0,margin:"0 6px"}}/>
      <span style={{fontSize:9,fontWeight:700,color:P.t3}}>가동시간</span>
      {[{l:"원수",v:L.pHrs.raw,c:P.cyan},{l:"관수",v:L.pHrs.irr,c:P.green},{l:"A",v:L.pHrs.dA,c:P.blue},{l:"B",v:L.pHrs.dB,c:P.teal},{l:"산",v:L.pHrs.acid,c:P.red}].map(p=>(
        <div key={p.l} style={{textAlign:"center",minWidth:36}}><div style={{fontSize:7,color:P.t4}}>{p.l}</div>
          <span style={{fontSize:13,fontWeight:800,fontFamily:FN,color:p.c}}>{p.v}</span><span style={{fontSize:7,color:P.t4}}>h</span></div>))}
    </div>
  </Glass>
</div>)}

{/* ═══ MOBILE DASHBOARD ═══ */}
{pg==="dash"&&mob&&(
<div style={{display:"flex",flexDirection:"column",gap:10,animation:"hcFade .25s"}}>
  {/* 핵심 센서 */}
  <Glass style={{padding:12}}>
    <span style={{fontSize:14,fontWeight:800,marginBottom:8,display:"block"}}>📈 실시간 센서</span>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[{label:"급액EC",value:L.ec,max:4,unit:"mS",c:P.cyan},{label:"급액pH",value:L.ph,max:10,unit:"pH",c:P.violet},
        {label:"배액EC",value:L.dEC,max:4,unit:"mS",c:P.amber},{label:"배액pH",value:L.dPH,max:10,unit:"pH",c:P.orange}
      ].map((g,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:P.s0,border:`1px solid ${P.b0}`}}>
          <Ring {...g} sz={56} thick={4}/>
          <div><div style={{fontSize:11,color:P.t3,fontWeight:600}}>{g.label}</div>
            <span style={{fontSize:22,fontWeight:800,fontFamily:FN,color:g.c}}>{g.value}</span>
            <span style={{fontSize:10,color:P.t4,marginLeft:2}}>{g.unit}</span></div>
        </div>))}
    </div>
  </Glass>
  {/* 환경 */}
  <Glass style={{padding:12}}>
    <span style={{fontSize:14,fontWeight:800,marginBottom:8,display:"block"}}>🌡️ 환경</span>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
      {[{l:"일사량",v:L.sol,u:"W/m²",c:P.amber},{l:"온도",v:L.tmp,u:"℃",c:P.red},
        {l:"습도",v:L.hum,u:"%",c:P.teal},{l:"수온",v:L.wT,u:"℃",c:P.blue}].map((m,i)=>(
        <div key={i} style={{textAlign:"center",padding:"8px",borderRadius:8,background:P.s0,border:`1px solid ${P.b0}`}}>
          <div style={{fontSize:10,color:P.t4}}>{m.l}</div>
          <span style={{fontSize:20,fontWeight:800,fontFamily:FN,color:m.c}}>{m.v}</span>
          <div style={{fontSize:9,color:P.t4}}>{m.u}</div>
        </div>))}
    </div>
  </Glass>
  {/* 운전 상태 */}
  <Glass style={{padding:12}}>
    <span style={{fontSize:14,fontWeight:800,marginBottom:8,display:"block"}}>📋 운전 상태</span>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
      {[{l:"프로그램",v:`${L.prg}번`,c:P.cyan},{l:"밸브",v:`V${L.av}`,c:P.green},
        {l:"원수펌프",v:L.pR?"ON":"OFF",c:L.pR?P.green:P.t4},{l:"관수펌프",v:L.pM?"ON":"OFF",c:L.pM?P.green:P.t4},
        {l:"교반기",v:L.ag?"ON":"OFF",c:L.ag?P.teal:P.t4},{l:"도징",v:L.pM?"ON":"OFF",c:L.pM?P.violet:P.t4},
        {l:"관수횟수",v:`${L.iCnt}회`,c:P.cyan},{l:"배액률",v:`${L.dPct}%`,c:P.orange}
      ].map((row,i)=>(
        <div key={i} style={{padding:"6px 8px",borderRadius:8,background:P.s0,border:`1px solid ${P.b0}`,textAlign:"center"}}>
          <div style={{fontSize:10,color:P.t4}}>{row.l}</div>
          <span style={{fontSize:16,fontWeight:800,fontFamily:FN,color:row.c}}>{row.v}</span>
        </div>))}
    </div>
  </Glass>
  {/* EC/pH 추이 */}
  <Glass style={{padding:12}}>
    <span style={{fontSize:14,fontWeight:800,marginBottom:8,display:"block"}}>📈 EC/pH 추이</span>
    {[{l:"EC",v:L.ec,u:"mS",c:P.cyan,d:L.ecH,sp:2.0},{l:"pH",v:L.ph,u:"pH",c:P.violet,d:L.phH,sp:6.0}].map((row,i)=>(
      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:i===0?`1px solid ${P.b0}10`:"none"}}>
        <div style={{width:55}}><div style={{fontSize:10,color:P.t4}}>{row.l}</div>
          <span style={{fontSize:24,fontWeight:800,fontFamily:FN,color:row.c}}>{row.v}</span>
          <span style={{fontSize:9,color:P.t4}}>{row.u}</span></div>
        <Spark data={row.d} c={row.c} sp={row.sp} w={220} h={40} fill/>
        <div style={{textAlign:"right"}}><div style={{fontSize:9,color:P.t4}}>설정</div>
          <span style={{fontSize:14,fontWeight:800,fontFamily:FN,color:P.amber}}>{row.sp}</span></div>
      </div>))}
  </Glass>
  {/* 경보 */}
  <Glass style={{padding:12}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
      <span style={{fontSize:14,fontWeight:800}}>⚠️ 경보</span>
      <Chip c={P.red} soft>{L.alarms.filter(a=>a.lv==="high").length}건</Chip></div>
    {L.alarms.map((a,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,marginBottom:4,
      background:a.lv==="high"?`${P.red}08`:a.lv==="warn"?`${P.amber}06`:P.s0,border:`1px solid ${a.lv==="high"?`${P.red}15`:P.b0}`}}>
      <Dot c={a.lv==="high"?P.red:a.lv==="warn"?P.amber:a.lv==="info"?P.cyan:P.green} s={8} pulse={a.lv==="high"}/>
      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:a.lv==="high"?P.red:a.lv==="warn"?P.amber:P.t1}}>{a.msg}</div>
        <span style={{fontSize:10,color:P.t4,fontFamily:FN}}>{a.t}</span></div></div>))}
  </Glass>
  {/* 제어 버튼 */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
    {[{l:"🛑 비상정지",c:P.red,g:P.redGlow},{l:"▶ 동작",c:P.green,g:P.greenGlow},{l:"🔧 수동",c:P.amber,g:P.amberGlow},{l:"⏸ 일시정지",c:P.blue,g:`${P.blue}12`}].map(b=>(
      <button key={b.l} className="hcBtn" onClick={()=>handleControl(b.l)}
        style={{padding:"14px",borderRadius:10,background:b.g,border:`1.5px solid ${b.c}30`,color:b.c,fontSize:14,fontWeight:800}}>{b.l}</button>))}
  </div>
</div>)}
{pg==="flow"&&!mob&&(
<div style={{display:"flex",flexDirection:"column",gap:5,animation:"hcFade .2s",height:554}}>
  {/* ── 상단: P&ID 흐름도 (약 260px) ── */}
  <Glass style={{padding:"8px 14px",flex:"0 0 auto"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:12,fontWeight:800}}>🔄 시스템 흐름도</span>
        <Chip c={P.green} soft><Dot c={P.green} pulse s={5}/> LIVE</Chip></div>
      <div style={{display:"flex",gap:8}}>
        {[{l:"EC",v:L.ec,u:"mS",c:P.cyan},{l:"pH",v:L.ph,u:"",c:P.violet},{l:"일사",v:L.sol,u:"W",c:P.amber}].map(s=>(
          <div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:7,color:P.t4}}>{s.l}</div>
            <span style={{fontSize:16,fontWeight:800,fontFamily:FN,color:s.c}}>{s.v}</span>
            {s.u&&<span style={{fontSize:7,color:P.t4}}>{s.u}</span>}</div>))}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"180px 30px 150px 30px 110px 30px 1fr",alignItems:"center"}}>
      {/* ◆ DOSING TANKS */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
        <span style={{fontSize:9,fontWeight:700,color:P.t3,letterSpacing:1}}>DOSING TANKS</span>
        <div style={{display:"grid",gridTemplateColumns:env.tankCount<=6?"1fr 1fr 1fr":`repeat(${Math.min(env.tankCount,5)},1fr)`,gap:3}}>
          {env.tanks.slice(0,env.tankCount).map((tk,i)=>{const f=L.tankLevels[i]||0;return(
            <div key={tk.id} style={{width:env.tankCount<=6?50:34,height:env.tankCount<=6?64:48,borderRadius:6,position:"relative",overflow:"hidden",
              background:`linear-gradient(180deg,${P.s1},${P.s0})`,border:`1.5px solid ${tk.c}30`,boxShadow:`0 2px 8px ${tk.c}08`}}>
              <div style={{position:"absolute",bottom:0,width:"100%",height:`${f}%`,
                background:`linear-gradient(to top,${tk.c}45,${tk.c}12)`,transition:"height .8s",borderTop:`1px solid ${tk.c}40`}}/>
              <div style={{position:"relative",width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                <span style={{fontSize:env.tankCount<=6?16:11,fontWeight:900,color:tk.c,fontFamily:FN,textShadow:`0 0 6px ${tk.c}30`}}>{tk.id}</span>
                <span style={{fontSize:env.tankCount<=6?9:7,color:P.t2,fontFamily:FN,fontWeight:700}}>{f}%</span></div>
            </div>);})}
        </div>
      </div>
      {/* → */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="24" height="14" viewBox="0 0 24 14"><path d="M0 7h18M14 2l6 5-6 5" fill="none" stroke={P.cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1.5s" repeatCount="indefinite"/></path></svg></div>
      {/* ◆ MIX TANK */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{width:145,padding:"12px 8px",borderRadius:14,textAlign:"center",position:"relative",
          background:`linear-gradient(135deg,${P.s2},${P.s3})`,border:`1.5px solid ${P.b2}`,boxShadow:`0 4px 20px ${P.bg}80`}}>
          {L.ag&&<div style={{position:"absolute",top:6,right:6}}><svg width="14" height="14" viewBox="0 0 14 14" style={{animation:"hcSpin 2s linear infinite"}}>
            <path d="M7 2L7 5M7 9L7 12M2 7L5 7M9 7L12 7" stroke={P.teal} strokeWidth="2" strokeLinecap="round"/></svg></div>}
          <div style={{fontSize:8,color:P.t4,letterSpacing:1}}>MIXING TANK</div>
          <div style={{fontSize:13,fontWeight:800,marginBottom:6}}>양액혼합</div>
          <div style={{display:"flex",gap:6,justifyContent:"center"}}>
            <div style={{padding:"4px 10px",borderRadius:6,background:`${P.cyan}12`,border:`1px solid ${P.cyan}25`}}>
              <div style={{fontSize:7,color:P.t4}}>EC</div><span style={{fontSize:18,fontWeight:800,fontFamily:FN,color:P.cyan}}>{L.ec}</span></div>
            <div style={{padding:"4px 10px",borderRadius:6,background:`${P.violet}12`,border:`1px solid ${P.violet}25`}}>
              <div style={{fontSize:7,color:P.t4}}>pH</div><span style={{fontSize:18,fontWeight:800,fontFamily:FN,color:P.violet}}>{L.ph}</span></div>
          </div>
        </div>
      </div>
      {/* → */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="24" height="14" viewBox="0 0 24 14"><path d="M0 7h18M14 2l6 5-6 5" fill="none" stroke={P.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
      {/* ◆ PUMPS */}
      <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"center"}}>
        <span style={{fontSize:9,fontWeight:700,color:P.t3,letterSpacing:1}}>PUMPS</span>
        {[{l:"원수펌프",on:L.pR,c:P.cyan},{l:"관수펌프",on:L.pM,c:P.green}].map(p=>(
          <div key={p.l} style={{padding:"6px 10px",borderRadius:8,width:105,
            background:p.on?`${p.c}10`:P.s0,border:`1.5px solid ${p.on?p.c:P.b0}50`,display:"flex",alignItems:"center",gap:5,
            boxShadow:p.on?`0 0 12px ${p.c}15`:"none"}}>
            <Dot c={p.on?p.c:P.t4} pulse={p.on} s={6}/><div>
              <div style={{fontSize:10,fontWeight:700,color:p.on?p.c:P.t4}}>{p.l}</div>
              <div style={{fontSize:8,fontFamily:FN,color:p.on?P.t2:P.t4,fontWeight:600}}>{p.on?"RUN":"OFF"}</div></div>
          </div>))}
      </div>
      {/* → */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="24" height="14" viewBox="0 0 24 14"><path d="M0 7h18M14 2l6 5-6 5" fill="none" stroke={P.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
      {/* ◆ ZONE VALVES */}
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:9,fontWeight:700,color:P.t3,letterSpacing:1}}>ZONE VALVES ({env.valveCount})</span>
          <Chip c={P.green}><Dot c={P.w} pulse s={4}/> V{L.av}</Chip></div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(env.valveCount,7)},1fr)`,gap:3}}>
          {Array.from({length:env.valveCount}).map((_,i)=>{const a=L.av===i+1;return(
            <div key={i} style={{height:env.valveCount>14?24:30,borderRadius:5,
              background:a?`linear-gradient(135deg,${P.green}20,${P.green}10)`:P.s0,
              border:`1.5px solid ${a?P.green:`${P.b0}80`}`,display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:a?`0 0 10px ${P.green}25`:"none",transition:"all .3s"}}>
              <span style={{fontSize:env.valveCount>14?9:12,fontWeight:800,fontFamily:FN,color:a?P.green:P.t4}}>{i+1}</span>
            </div>);})}
        </div>
      </div>
    </div>
  </Glass>

  {/* ── 하단: 이력 + 통계 (나머지 영역 채움) ── */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,flex:1,minHeight:0}}>
    {/* 좌: 관수이력 테이블 */}
    <Glass style={{padding:"8px 10px",display:"flex",flexDirection:"column",minHeight:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:12,fontWeight:800}}>📝 관수 이력</span>
        <Chip c={P.t3} soft sm>{L.iLog.length}건</Chip></div>
      <div style={{flex:1,overflow:"auto",minHeight:0}} className="hcS">
        <div style={{display:"grid",gridTemplateColumns:"50px 52px 52px 46px 46px 46px",gap:4,padding:"4px 0",borderBottom:`1.5px solid ${P.b0}`,color:P.t4,fontWeight:700,fontSize:10,position:"sticky",top:0,background:P.glass}}>
          <span>시각</span><span>밸브</span><span>시간</span><span>유량L</span><span>EC</span><span>pH</span></div>
        {L.iLog.map((row,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"50px 52px 52px 46px 46px 46px",gap:4,
          padding:"6px 0",borderBottom:`1px solid ${P.b0}10`,color:P.t2,fontFamily:FN,fontWeight:600,fontSize:12}}>
          <span style={{color:P.t3}}>{row.t}</span><span>{row.v}</span><span>{row.dur}</span>
          <span style={{color:P.cyan}}>{row.vol}</span><span style={{color:P.cyan}}>{row.ec}</span><span style={{color:P.violet}}>{row.ph}</span>
        </div>))}
      </div>
    </Glass>
    {/* 우: 가동시간 + 밸브차트 + 경보 */}
    <div style={{display:"grid",gridTemplateRows:"auto 1fr auto",gap:5,minHeight:0}}>
      {/* 가동시간 — 가로 배치 */}
      <Glass style={{padding:"6px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,fontWeight:800,marginRight:4}}>⏱️ 가동시간</span>
          {[{l:"원수",v:L.pHrs.raw,c:P.cyan},{l:"관수",v:L.pHrs.irr,c:P.green},{l:"A액",v:L.pHrs.dA,c:P.blue},
            {l:"B액",v:L.pHrs.dB,c:P.teal},{l:"산",v:L.pHrs.acid,c:P.red}].map((p,i)=>(
            <div key={i} style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:8,color:P.t4}}>{p.l}</div>
              <span style={{fontSize:14,fontWeight:800,fontFamily:FN,color:p.c}}>{p.v}</span>
              <span style={{fontSize:7,color:P.t4}}>h</span></div>))}
        </div>
      </Glass>
      {/* 밸브 관수횟수 차트 */}
      <Glass style={{padding:"8px 10px",display:"flex",flexDirection:"column",minHeight:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:10,fontWeight:800}}>📊 밸브별 관수횟수 (금일)</span>
          <span style={{fontSize:9,color:P.t4}}>총 {L.vCnt.slice(0,env.valveCount).reduce((a,b)=>a+b,0)}회</span></div>
        <div style={{display:"flex",gap:env.valveCount>14?2:3,alignItems:"flex-end",flex:1,minHeight:0}}>
          {L.vCnt.slice(0,env.valveCount).map((v,i)=>{const mx=Math.max(...L.vCnt.slice(0,env.valveCount))||1;const a=L.av===i+1;return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,height:"100%",justifyContent:"flex-end"}}>
              <span style={{fontSize:env.valveCount>14?7:9,fontFamily:FN,fontWeight:700,color:a?P.green:P.t3}}>{v}</span>
              <div style={{width:"100%",height:`${(v/mx)*100}%`,minHeight:2,borderRadius:"3px 3px 0 0",
                background:a?`linear-gradient(to top,${P.green},${P.green}80)`:`linear-gradient(to top,${P.cyan}60,${P.cyan}20)`,
                boxShadow:a?`0 0 8px ${P.green}30`:"none",transition:"height .5s"}}/>
              <span style={{fontSize:env.valveCount>14?6:8,fontFamily:FN,color:a?P.green:P.t4,fontWeight:a?800:600}}>{i+1}</span>
            </div>);})}
        </div>
      </Glass>
      {/* 경보 이력 */}
      <Glass style={{padding:"6px 10px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:10,fontWeight:800}}>⚠️ 경보 이력</span>
          <Chip c={P.red} soft sm>{L.alarms.filter(a=>a.lv==="high").length}건</Chip></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
          {L.alarms.slice(0,4).map((a,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 6px",borderRadius:5,
            background:a.lv==="high"?`${P.red}06`:a.lv==="warn"?`${P.amber}06`:P.s0,
            border:`1px solid ${a.lv==="high"?`${P.red}15`:a.lv==="warn"?`${P.amber}15`:P.b0}`}}>
            <Dot c={a.lv==="high"?P.red:a.lv==="warn"?P.amber:a.lv==="info"?P.cyan:P.green} s={5} pulse={a.lv==="high"}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:9,fontWeight:600,color:a.lv==="high"?P.red:a.lv==="warn"?P.amber:P.t2,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.msg}</div>
              <div style={{fontSize:7,color:P.t4,fontFamily:FN}}>{a.t}</div></div></div>))}
        </div>
      </Glass>
    </div>
  </div>
</div>)}

{/* ═══ MOBILE FLOW + HISTORY ═══ */}
{pg==="flow"&&mob&&(
<div style={{display:"flex",flexDirection:"column",gap:10,animation:"hcFade .25s"}}>
  {/* 시스템 상태 요약 */}
  <Glass style={{padding:12}}>
    <span style={{fontSize:14,fontWeight:800,marginBottom:8,display:"block"}}>🔄 시스템 상태</span>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
      <div style={{padding:"10px",borderRadius:10,background:`${P.cyan}08`,border:`1px solid ${P.cyan}15`,textAlign:"center"}}>
        <div style={{fontSize:10,color:P.t4}}>급액 EC</div>
        <span style={{fontSize:28,fontWeight:800,fontFamily:FN,color:P.cyan}}>{L.ec}</span>
        <span style={{fontSize:10,color:P.t4}}> mS</span></div>
      <div style={{padding:"10px",borderRadius:10,background:`${P.violet}08`,border:`1px solid ${P.violet}15`,textAlign:"center"}}>
        <div style={{fontSize:10,color:P.t4}}>급액 pH</div>
        <span style={{fontSize:28,fontWeight:800,fontFamily:FN,color:P.violet}}>{L.ph}</span></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
      {[{l:"원수",on:L.pR,c:P.cyan},{l:"관수",on:L.pM,c:P.green},{l:"교반",on:L.ag,c:P.teal},{l:`V${L.av}`,on:true,c:P.green}].map((p,i)=>(
        <div key={i} style={{padding:"6px",borderRadius:8,background:p.on?`${p.c}10`:P.s0,border:`1px solid ${p.on?p.c:P.b0}50`,textAlign:"center"}}>
          <Dot c={p.on?p.c:P.t4} pulse={p.on} s={6} style={{margin:"0 auto 3px"}}/>
          <div style={{fontSize:11,fontWeight:700,color:p.on?p.c:P.t4}}>{p.l}</div>
          <div style={{fontSize:10,fontFamily:FN,color:p.on?P.t2:P.t4}}>{p.on?"ON":"OFF"}</div></div>))}
    </div>
  </Glass>
  {/* 도싱탱크 */}
  <Glass style={{padding:12}}>
    <span style={{fontSize:14,fontWeight:800,marginBottom:8,display:"block"}}>🧪 도싱탱크</span>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(env.tankCount,5)},1fr)`,gap:6}}>
      {env.tanks.slice(0,env.tankCount).map((tk,i)=>{const f=L.tankLevels[i]||0;return(
        <div key={tk.id} style={{height:70,borderRadius:8,position:"relative",overflow:"hidden",
          background:`linear-gradient(180deg,${P.s1},${P.s0})`,border:`1.5px solid ${tk.c}30`}}>
          <div style={{position:"absolute",bottom:0,width:"100%",height:`${f}%`,background:`linear-gradient(to top,${tk.c}40,${tk.c}10)`}}/>
          <div style={{position:"relative",width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:16,fontWeight:900,color:tk.c,fontFamily:FN}}>{tk.id}</span>
            <span style={{fontSize:11,color:P.t2,fontFamily:FN}}>{f}%</span></div>
        </div>);})}
    </div>
  </Glass>
  {/* 관수 이력 */}
  <Glass style={{padding:12}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
      <span style={{fontSize:14,fontWeight:800}}>📝 관수 이력</span>
      <Chip c={P.t3} soft>{L.iLog.length}건</Chip></div>
    {L.iLog.map((row,i)=>(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px",borderRadius:8,marginBottom:4,
      background:P.s0,border:`1px solid ${P.b0}`}}>
      <div><span style={{fontSize:12,fontWeight:700,color:P.t2,fontFamily:FN}}>{row.t}</span>
        <span style={{fontSize:11,color:P.t4,marginLeft:6}}>{row.v}</span></div>
      <div style={{display:"flex",gap:10}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:8,color:P.t4}}>유량</div><span style={{fontSize:13,fontWeight:700,fontFamily:FN,color:P.cyan}}>{row.vol}</span></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:8,color:P.t4}}>EC</div><span style={{fontSize:13,fontWeight:700,fontFamily:FN,color:P.cyan}}>{row.ec}</span></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:8,color:P.t4}}>pH</div><span style={{fontSize:13,fontWeight:700,fontFamily:FN,color:P.violet}}>{row.ph}</span></div>
      </div></div>))}
  </Glass>
  {/* 가동시간 */}
  <Glass style={{padding:12}}>
    <span style={{fontSize:14,fontWeight:800,marginBottom:8,display:"block"}}>⏱️ 가동시간</span>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:6}}>
      {[{l:"원수",v:L.pHrs.raw,c:P.cyan},{l:"관수",v:L.pHrs.irr,c:P.green},{l:"A액",v:L.pHrs.dA,c:P.blue},
        {l:"B액",v:L.pHrs.dB,c:P.teal},{l:"산",v:L.pHrs.acid,c:P.red}].map((p,i)=>(
        <div key={i} style={{textAlign:"center",padding:"6px",borderRadius:8,background:P.s0,border:`1px solid ${P.b0}`}}>
          <div style={{fontSize:10,color:P.t4}}>{p.l}</div>
          <span style={{fontSize:18,fontWeight:800,fontFamily:FN,color:p.c}}>{p.v}</span>
          <span style={{fontSize:8,color:P.t4}}>h</span></div>))}
    </div>
  </Glass>
</div>)}

{/* ═══ PAGE: IRRIGATION MODES ═══ */}
{pg==="prog"&&(
<div style={{animation:"hcFade .25s",display:"flex",flexDirection:"column",gap:6}}>
  <Glass style={{padding:"6px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}>
    <ProgSel/><div style={{width:1,height:22,background:P.b0,margin:"0 4px"}}/>
    {[{l:"☀️일사량",on:pr.solar.on,c:P.amber},{l:"⏱️타이머",on:pr.timer.on,c:P.blue},{l:"🕐지정시각",on:pr.fixed.on,c:P.green}].map(ch=>(
      <Chip key={ch.l} c={ch.on?ch.c:P.t4} soft sm>{ch.l} {ch.on?"ON":"OFF"}</Chip>))}
    <div style={{flex:1}}/><Tog on={pr.on} onChange={()=>updateProg(p=>({on:!p.on}))} label={pr.on?"사용":"미사용"}/>
  </div></Glass>
  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:6}}>
    <Glass style={{borderColor:pr.solar.on?`${P.amber}25`:P.glassBorder}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <SH icon="☀️" title="일사량 비례" sub="누적 일사량 기준" c={P.amber}/><Tog on={pr.solar.on} c={P.amber} onChange={()=>updateProg(p=>({solar:{...p.solar,on:!p.solar.on}}))}/></div>
      <div style={{opacity:pr.solar.on?1:.25,pointerEvents:pr.solar.on?"auto":"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,background:`${P.amber}06`}}>
          <div><div style={{fontSize:7,color:P.t4}}>기준값</div><span style={{fontSize:24,fontWeight:800,fontFamily:FN,color:P.amber}}>{pr.solar.val}</span><span style={{fontSize:8,color:P.t3,marginLeft:1}}>W/m²</span></div>
          <div style={{flex:1}}><LI value={pr.solar.val} unit="W/m²" c={P.amber} onChange={v=>updateProg(p=>({solar:{...p.solar,val:v}}))}/></div>
        </div></div>
    </Glass>
    <Glass style={{borderColor:pr.timer.on?`${P.blue}25`:P.glassBorder}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <SH icon="⏱️" title="작동간격" sub="설정 간격 자동관수" c={P.blue}/><Tog on={pr.timer.on} c={P.blue} onChange={()=>updateProg(p=>({timer:{...p.timer,on:!p.timer.on}}))}/></div>
      <div style={{opacity:pr.timer.on?1:.25,pointerEvents:pr.timer.on?"auto":"none"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:5}}>
          {[{l:"간격",v:pr.timer.int,c:P.blue},{l:"시작",v:pr.timer.from,c:P.t1},{l:"종료",v:pr.timer.to,c:P.t1}].map((f,i)=>(
            <div key={i} style={{textAlign:"center",padding:"4px",borderRadius:6,background:`${P.blue}05`}}>
              <div style={{fontSize:7,color:P.t4}}>{f.l}</div><span style={{fontSize:16,fontWeight:800,fontFamily:FN,color:f.c}}>{f.v}</span></div>))}
        </div>
        <div style={{display:"flex",gap:4}}>
          <LI label="간격" value={pr.timer.int} sm onChange={v=>updateProg(p=>({timer:{...p.timer,int:v}}))}/>
          <LI label="시작" value={pr.timer.from} sm onChange={v=>updateProg(p=>({timer:{...p.timer,from:v}}))}/>
          <LI label="종료" value={pr.timer.to} sm onChange={v=>updateProg(p=>({timer:{...p.timer,to:v}}))}/>
        </div></div>
    </Glass>
    <Glass style={{borderColor:pr.fixed.on?`${P.green}25`:P.glassBorder}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <SH icon="🕐" title="시작시간 지정" sub={`14슬롯 · ${pr.fixed.times.filter(t=>t).length}개`} c={P.green}/>
        <Tog on={pr.fixed.on} c={P.green} onChange={()=>updateProg(p=>({fixed:{...p.fixed,on:!p.fixed.on}}))}/></div>
      <div style={{opacity:pr.fixed.on?1:.25,pointerEvents:pr.fixed.on?"auto":"none",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {pr.fixed.times.map((t,i)=>(<div key={i} style={{position:"relative"}}>
          <input className="hcI hcIs" value={t} placeholder="--:--"
            onChange={e=>{const ts=[...pr.fixed.times];ts[i]=e.target.value;updateProg(p=>({fixed:{...p.fixed,times:ts}}));}}
            style={{fontSize:9,padding:"5px 2px",background:t?`${P.green}08`:P.iBg,borderColor:t?`${P.green}30`:P.iB}}/>
          <span style={{position:"absolute",top:-3,right:-2,fontSize:7,fontWeight:700,fontFamily:FN,background:t?P.green:P.t4,color:P.bg,borderRadius:3,padding:"0 3px",lineHeight:"11px"}}>{i+1}</span>
        </div>))}
      </div>
    </Glass>
  </div>
  <div style={{display:"flex",alignItems:"center",gap:6}}>
    <Glass style={{flex:1,padding:"6px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:10,fontWeight:700,color:P.t2}}>📅 적용 요일</span>
      {dn.map((d,i)=>(<div key={d} onClick={()=>{const ds=[...pr.days];ds[i]=ds[i]?0:1;updateProg(()=>({days:ds}));}}
        style={{width:34,height:34,borderRadius:7,background:pr.days[i]?`${P.cyan}18`:P.s0,border:`1.5px solid ${pr.days[i]?P.cyan:P.b0}`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:pr.days[i]?P.cyan:P.t4,cursor:"pointer"}}>{d}</div>))}
      <span style={{fontSize:9,color:P.t4}}>{pr.days.reduce((a,v)=>a+v,0)}/7</span>
    </div></Glass>
    <button className="hcBtn" onClick={()=>{setProgs(ps=>{const n=[...ps];n[ap]=mkProg(pr.id);return n;});showToast("초기화","warn");}}
      style={{padding:"8px 16px",borderRadius:7,background:P.s1,border:`1px solid ${P.b0}`,color:P.t3,fontSize:10}}>🔄 초기화</button>
    <button className="hcBtn" onClick={handleSaveProgram}
      style={{padding:"8px 22px",borderRadius:7,background:`linear-gradient(135deg,${P.cyan}30,${P.blue}20)`,border:`1.5px solid ${P.cyan}30`,color:P.cyan,fontSize:11,fontWeight:800}}>💾 저장</button>
  </div>
</div>)}

{/* ═══ PAGE: VALVE ═══ */}
{pg==="valve"&&(()=>{
  const vc=env.valveCount;
  const cols=vc<=8?vc:vc<=16?Math.ceil(vc/2):Math.ceil(vc/3);
  const selV=L.av;
  return(
<div style={{animation:"hcFade .25s",display:"flex",flexDirection:"column",gap:5}}>
  {/* Top bar */}
  <Glass style={{padding:"6px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}>
    <ProgSel small/>
    <div style={{width:1,height:18,background:P.b0}}/>
    <span style={{fontSize:10,fontWeight:700,color:P.t2}}>🔧 밸브 {vc}개</span>
    <div style={{flex:1}}/>
    <Chip c={P.green} soft><Dot c={P.green} pulse s={4}/> V{selV} 관수중</Chip>
  </div></Glass>

  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 320px",gap:5}}>
    {/* LEFT: Visual valve grid */}
    <Glass>
      <SH icon="💧" title="밸브 상태" sub="터치하여 선택 · 녹색=현재 관수중" c={P.green}/>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:4}}>
        {Array.from({length:vc}).map((_,i)=>{
          const vn=i+1, active=selV===vn;
          const t=pr.vTime[i]||"00:10", f=pr.vFlow[i]||"0150", cnt=L.vCnt[i]||0;
          return(
          <div key={i} style={{padding:"6px 4px",borderRadius:8,cursor:"pointer",transition:"all .2s",
            background:active?`linear-gradient(135deg,${P.green}15,${P.green}08)`:`${P.s0}`,
            border:`1.5px solid ${active?P.green:`${P.b0}80`}`,
            boxShadow:active?`0 0 12px ${P.green}20,inset 0 1px 0 ${P.green}10`:"none",
            position:"relative",overflow:"hidden"}}
            onClick={()=>setL(p=>({...p,av:vn}))}>
            {/* 진행도 배경 바 */}
            {active&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${P.green},${P.green}60)`,borderRadius:"0 0 6px 6px"}}>
              <div style={{width:"60%",height:"100%",background:P.green,borderRadius:"0 0 0 6px",animation:"hcShimmer 2s linear infinite",
                backgroundImage:`linear-gradient(90deg,${P.green}00,${P.green}ff,${P.green}00)`,backgroundSize:"200% 100%"}}/>
            </div>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:14,fontWeight:900,fontFamily:FN,color:active?P.green:P.t3,lineHeight:1}}>{vn}</span>
              {active&&<Dot c={P.green} pulse s={6}/>}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:P.t4}}>
              <span>⏱ {t}</span><span>💧 {parseInt(f)}ml</span>
            </div>
            <div style={{fontSize:7,color:P.t4,marginTop:1,textAlign:"right"}}>
              {cnt>0&&<span style={{color:P.cyan}}>금일 {cnt}회</span>}
            </div>
          </div>);})}
      </div>
    </Glass>

    {/* RIGHT: Selected valve detail + batch edit */}
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {/* Selected valve detail */}
      <Glass glow={P.greenGlow} style={{borderColor:`${P.green}20`}}>
        <SH icon="🎯" title={`V${selV} 상세설정`}
          sub={selV===L.av?"현재 관수 중":"대기"} c={P.green}
          right={selV===L.av&&<Chip c={P.green}><Dot c={P.w} pulse s={4}/> ACTIVE</Chip>}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div style={{padding:"10px",borderRadius:8,background:`${P.teal}06`,border:`1px solid ${P.teal}15`,textAlign:"center"}}>
            <div style={{fontSize:8,color:P.teal,fontWeight:700,marginBottom:3}}>⏱ 관수시간</div>
            <input className="hcI" value={pr.vTime[selV-1]||"00:10"}
              onChange={e=>{const a=[...pr.vTime];a[selV-1]=e.target.value;updateProg(()=>({vTime:a}));}}
              style={{fontSize:20,fontWeight:800,padding:"8px",textAlign:"center",background:`${P.teal}08`,borderColor:`${P.teal}30`}}/>
            <div style={{fontSize:7,color:P.t4,marginTop:2}}>분:초</div>
          </div>
          <div style={{padding:"10px",borderRadius:8,background:`${P.cyan}06`,border:`1px solid ${P.cyan}15`,textAlign:"center"}}>
            <div style={{fontSize:8,color:P.cyan,fontWeight:700,marginBottom:3}}>💧 관수유량</div>
            <input className="hcI" value={pr.vFlow[selV-1]||"0150"}
              onChange={e=>{const a=[...pr.vFlow];a[selV-1]=e.target.value;updateProg(()=>({vFlow:a}));}}
              style={{fontSize:20,fontWeight:800,padding:"8px",textAlign:"center",background:`${P.cyan}08`,borderColor:`${P.cyan}30`}}/>
            <div style={{fontSize:7,color:P.t4,marginTop:2}}>mL</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
          {[{l:"금일 관수",v:`${L.vCnt[selV-1]||0}회`,c:P.cyan},
            {l:"상태",v:selV===L.av?"관수중":"대기",c:selV===L.av?P.green:P.t4},
            {l:"순서",v:`${selV}/${vc}`,c:P.t2}].map((st,i)=>(
            <div key={i} style={{padding:"4px 6px",borderRadius:5,background:P.s0,border:`1px solid ${P.b0}`,textAlign:"center"}}>
              <div style={{fontSize:7,color:P.t4}}>{st.l}</div>
              <span style={{fontSize:12,fontWeight:800,fontFamily:FN,color:st.c}}>{st.v}</span>
            </div>))}
        </div>
      </Glass>

      {/* Batch edit */}
      <Glass>
        <SH icon="📋" title="일괄 설정" sub="모든 밸브에 동일 값 적용" c={P.amber}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
          <div>
            <span style={{fontSize:8,fontWeight:600,color:P.teal}}>⏱ 일괄 시간</span>
            <input className="hcI" defaultValue="00:10" id="batchTime" style={{marginTop:2}}/>
          </div>
          <div>
            <span style={{fontSize:8,fontWeight:600,color:P.cyan}}>💧 일괄 유량</span>
            <input className="hcI" defaultValue="0150" id="batchFlow" style={{marginTop:2}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          <button className="hcBtn" style={{flex:1,padding:"7px",borderRadius:6,background:`${P.teal}12`,border:`1px solid ${P.teal}25`,color:P.teal,fontSize:9}}
            onClick={()=>{const v=document.getElementById("batchTime")?.value||"00:10";updateProg(()=>({vTime:Array(24).fill(v)}));showToast(`전체 시간 → ${v}`);}}>
            ⏱ 시간 일괄적용</button>
          <button className="hcBtn" style={{flex:1,padding:"7px",borderRadius:6,background:`${P.cyan}12`,border:`1px solid ${P.cyan}25`,color:P.cyan,fontSize:9}}
            onClick={()=>{const v=document.getElementById("batchFlow")?.value||"0150";updateProg(()=>({vFlow:Array(24).fill(v)}));showToast(`전체 유량 → ${v}`);}}>
            💧 유량 일괄적용</button>
        </div>
      </Glass>

      <button className="hcBtn" onClick={handleSaveProgram}
        style={{padding:"10px",borderRadius:8,width:"100%",background:`linear-gradient(135deg,${P.cyan}25,${P.blue}18)`,
          border:`1.5px solid ${P.cyan}25`,color:P.cyan,fontSize:11,fontWeight:800}}>💾 밸브설정 저장</button>
    </div>
  </div>
</div>);})()}

{/* ═══ PAGE: EC/pH ═══ */}
{pg==="dose"&&(
<div style={{animation:"hcFade .25s",display:"flex",flexDirection:"column",gap:6}}>
  <Glass style={{padding:"6px 12px"}}><ProgSel small/></Glass>
  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:6}}>
    <Glass glow={P.cyanGlow} style={{borderColor:`${P.cyan}18`}}>
      <SH icon="🧪" title="EC 제어" sub="양액 농도" c={P.cyan}/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 12px",borderRadius:8,background:`${P.cyan}06`,border:`1px solid ${P.cyan}10`}}>
        <div><div style={{fontSize:8,color:P.t4}}>목표</div>
          <span style={{fontSize:34,fontWeight:800,fontFamily:FN,color:P.cyan,lineHeight:1,letterSpacing:"-1px",textShadow:`0 0 14px ${P.cyan}25`}}>{pr.ec}</span>
          <span style={{fontSize:10,color:P.t3,marginLeft:2}}>mS</span></div>
        <div style={{flex:1}}/>
        <div style={{textAlign:"right"}}><div style={{fontSize:8,color:P.t4}}>현재</div>
          <span style={{fontSize:22,fontWeight:700,fontFamily:FN,color:Math.abs(L.ec-pr.ec)>0.3?P.amber:P.green}}>{L.ec}</span>
          <div style={{fontSize:8,color:Math.abs(L.ec-pr.ec)>0.3?P.amber:P.green,fontFamily:FN,fontWeight:600}}>{L.ec>=pr.ec?"+":""}{(L.ec-pr.ec).toFixed(2)}</div></div>
      </div>
      <div style={{marginBottom:3}}><span style={{fontSize:9,fontWeight:600,color:P.t3}}>도징비율 A~D</span></div>
      {Object.entries(pr.dEC).map(([k,v])=><DBar key={k} label={k} value={v} c={P.cyan}/>)}
    </Glass>
    <Glass glow={P.violetGlow} style={{borderColor:`${P.violet}18`}}>
      <SH icon="⚗️" title="pH 제어" sub="산도 조절" c={P.violet}/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 12px",borderRadius:8,background:`${P.violet}06`,border:`1px solid ${P.violet}10`}}>
        <div><div style={{fontSize:8,color:P.t4}}>목표</div>
          <span style={{fontSize:34,fontWeight:800,fontFamily:FN,color:P.violet,lineHeight:1,letterSpacing:"-1px",textShadow:`0 0 14px ${P.violet}25`}}>{pr.ph}</span>
          <span style={{fontSize:10,color:P.t3,marginLeft:2}}>pH</span></div>
        <div style={{flex:1}}/>
        <div style={{textAlign:"right"}}><div style={{fontSize:8,color:P.t4}}>현재</div>
          <span style={{fontSize:22,fontWeight:700,fontFamily:FN,color:Math.abs(L.ph-pr.ph)>0.3?P.amber:P.green}}>{L.ph}</span>
          <div style={{fontSize:8,color:Math.abs(L.ph-pr.ph)>0.3?P.amber:P.green,fontFamily:FN,fontWeight:600}}>{L.ph>=pr.ph?"+":""}{(L.ph-pr.ph).toFixed(2)}</div></div>
      </div>
      <div style={{marginBottom:3}}><span style={{fontSize:9,fontWeight:600,color:P.t3}}>도징비율 E~H</span></div>
      {Object.entries(pr.dPH).map(([k,v])=><DBar key={k} label={k} value={v} c={P.violet}/>)}
    </Glass>
  </div>
  <div style={{display:"flex",justifyContent:"flex-end"}}><button className="hcBtn" onClick={handleSaveProgram}
    style={{padding:"8px 24px",borderRadius:7,background:`linear-gradient(135deg,${P.cyan}30,${P.blue}20)`,border:`1.5px solid ${P.cyan}30`,color:P.cyan,fontSize:11,fontWeight:800}}>💾 저장</button></div>
</div>)}

{/* ═══ PAGE: ENV ═══ */}
{pg==="env"&&(()=>{
  const et=envTab,setEt=setEnvTab;
  const envTabs=[{id:"hw",icon:"🔩",l:"하드웨어"},{id:"ctrl",icon:"⚡",l:"양액제어"},{id:"alarm",icon:"🚨",l:"경보"},{id:"equip",icon:"🔧",l:"설비/시스템"}];
  return(
<div style={{animation:"hcFade .25s",display:"flex",flexDirection:"column",gap:5}}>
  {/* Sub-tab bar */}
  <Glass style={{padding:mob?"8px":"5px 10px"}}><div style={{display:"flex",alignItems:"center",gap:mob?6:4,flexWrap:mob?"wrap":"nowrap"}}>
    <span style={{fontSize:mob?13:11,fontWeight:800}}>🛡️ 환경설정</span>
    {!mob&&<div style={{width:1,height:16,background:P.b0,margin:"0 4px"}}/>}
    {envTabs.map(t=>(
      <div key={t.id} onClick={()=>setEt(t.id)} style={{padding:mob?"8px 14px":"4px 12px",borderRadius:mob?8:6,cursor:"pointer",
        background:et===t.id?`linear-gradient(135deg,${P.cyan}20,${P.blue}12)`:"transparent",
        border:`1px solid ${et===t.id?`${P.cyan}30`:"transparent"}`,
        color:et===t.id?P.cyan:P.t3,fontSize:mob?12:10,fontWeight:700,transition:"all .15s",
        display:"flex",alignItems:"center",gap:3}}>{t.icon} {t.l}</div>))}
    <div style={{flex:1}}/>
    <button className="hcBtn" onClick={handleSaveConfig}
      style={{padding:mob?"8px 20px":"5px 18px",borderRadius:mob?8:6,background:`linear-gradient(135deg,${P.cyan}25,${P.blue}18)`,
        border:`1.5px solid ${P.cyan}25`,color:P.cyan,fontSize:mob?12:10,fontWeight:800}}>💾 저장</button>
  </div></Glass>

  {/* ── TAB: 하드웨어 ── */}
  {et==="hw"&&(
  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:5}}>
    {/* 도싱탱크 */}
    <Glass>
      <SH icon="🧪" title="도싱탱크 설정" sub={`${env.tankCount}개 사용 중 · 최대 10개`} c={P.violet}/>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:6}}>
        <span style={{fontSize:9,fontWeight:700,color:P.t2}}>탱크 수</span>
        {[3,4,5,6,7,8,9,10].map(n=>(
          <div key={n} onClick={()=>setEnv(e=>({...e,tankCount:n}))} style={{
            width:30,height:30,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:12,fontWeight:800,fontFamily:FN,cursor:"pointer",transition:"all .2s",
            background:env.tankCount===n?`${P.violet}20`:P.s0,border:`1.5px solid ${env.tankCount===n?P.violet:P.b0}`,
            color:env.tankCount===n?P.violet:P.t4,boxShadow:env.tankCount===n?`0 0 10px ${P.violet}20`:"none"}}>{n}</div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
        {env.tanks.map((tk,i)=>{const active=i<env.tankCount;return(
          <div key={tk.id} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 7px",borderRadius:6,
            background:active?`${tk.c}06`:P.s0,border:`1px solid ${active?`${tk.c}15`:P.b0}`,
            opacity:active?1:.3,transition:"all .2s"}}>
            <div style={{width:20,height:20,borderRadius:5,background:`${tk.c}15`,border:`1px solid ${tk.c}30`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,fontFamily:FN,color:tk.c,flexShrink:0}}>{tk.id}</div>
            <span style={{fontSize:9,fontWeight:600,color:active?P.t1:P.t4,flex:1}}>{tk.name}</span>
            {active&&<Dot c={P.green} s={5}/>}
          </div>);})}
      </div>
      <div style={{marginTop:5,padding:"4px 8px",borderRadius:5,background:`${P.violet}06`,border:`1px solid ${P.violet}10`}}>
        <div style={{fontSize:8,color:P.t3}}>💡 3~6 한국형 A/B액 · 7~8 단비혼합 · 9~10 네덜란드 풀스펙</div>
      </div>
    </Glass>
    {/* 관수밸브 */}
    <Glass>
      <SH icon="💧" title="관수밸브 설정" sub={`${env.valveCount}개 구역 · 최대 24개`} c={P.green}/>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:6,flexWrap:"wrap"}}>
        <span style={{fontSize:9,fontWeight:700,color:P.t2}}>밸브 수</span>
        {[4,6,8,10,12,14,16,18,20,24].map(n=>(
          <div key={n} onClick={()=>setEnv(e=>({...e,valveCount:n}))} style={{
            width:30,height:30,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:12,fontWeight:800,fontFamily:FN,cursor:"pointer",transition:"all .2s",
            background:env.valveCount===n?`${P.green}20`:P.s0,border:`1.5px solid ${env.valveCount===n?P.green:P.b0}`,
            color:env.valveCount===n?P.green:P.t4,boxShadow:env.valveCount===n?`0 0 10px ${P.green}20`:"none"}}>{n}</div>))}
      </div>
      {/* Visual preview */}
      <div style={{padding:"6px",borderRadius:7,background:P.s0,border:`1px solid ${P.b0}`}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(env.valveCount,8)},1fr)`,gap:3}}>
          {Array.from({length:env.valveCount}).map((_,i)=>(
            <div key={i} style={{height:22,borderRadius:5,
              background:i<3?`${P.green}20`:`${P.b0}50`,
              border:`1px solid ${i<3?`${P.green}35`:P.b0}`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:8,fontWeight:700,fontFamily:FN,color:i<3?P.green:P.t4}}>{i+1}</span>
            </div>))}
        </div>
      </div>
      <div style={{marginTop:5,padding:"4px 8px",borderRadius:5,background:`${P.green}06`,border:`1px solid ${P.green}10`}}>
        <div style={{fontSize:8,color:P.t3}}>💡 소규모 4~8 · 중규모 10~16 · 대규모 18~24 구역</div>
      </div>
    </Glass>
  </div>)}

  {/* ── TAB: 양액제어 ── */}
  {et==="ctrl"&&(
  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:5}}>
    <Glass>
      <SH icon="📂" title="프로그램 사용설정" c={P.blue}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
        {progs.map((p,i)=>(<div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"6px 8px",borderRadius:7,background:p.on?`${P.green}06`:P.s0,border:`1px solid ${p.on?`${P.green}18`:P.b0}`}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:22,height:22,borderRadius:6,background:p.on?`${P.green}12`:P.s2,display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:800,fontFamily:FN,color:p.on?P.green:P.t4}}>{p.id}</span>
            <div><div style={{fontSize:10,fontWeight:700,color:p.on?P.t1:P.t3}}>{p.id}번</div>
              <div style={{fontSize:7,color:P.t4,fontFamily:FN}}>EC{p.ec} pH{p.ph}</div></div></div>
          <Tog on={p.on} onChange={()=>{setProgs(ps=>{const n=[...ps];n[i]={...n[i],on:!n[i].on};return n;});}}/>
        </div>))}
      </div>
    </Glass>
    <Glass>
      <SH icon="⚡" title="양액 자동공급" c={P.cyan}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:8,
        background:env.auto?`${P.green}06`:P.s0,border:`1px solid ${env.auto?`${P.green}20`:P.b0}`,marginBottom:8}}>
        <div><div style={{fontSize:11,fontWeight:800}}>자동공급</div><div style={{fontSize:8,color:P.t4}}>비례+%단계별 도징</div></div>
        <Tog on={env.auto} onChange={()=>setEnv(e=>({...e,auto:!e.auto}))}/></div>
      <div style={{padding:"6px 8px",borderRadius:7,background:`${P.amber}05`,border:`1px solid ${P.amber}12`,marginBottom:6}}>
        <div style={{fontSize:9,fontWeight:700,color:P.amber,marginBottom:4}}>⚠️ 다량공급 임계값</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <LI label="EC 편차" value={env.bulkEC} unit="mS" c={P.cyan} onChange={v=>setEnv(e=>({...e,bulkEC:v}))}/>
          <LI label="pH 편차" value={env.bulkPH} unit="pH" c={P.violet} onChange={v=>setEnv(e=>({...e,bulkPH:v}))}/>
        </div></div>
      <div style={{padding:"6px 8px",borderRadius:7,background:`${P.blue}05`,border:`1px solid ${P.blue}12`}}>
        <div style={{fontSize:9,fontWeight:700,color:P.blue,marginBottom:4}}>🎯 정밀도 (불감대)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <LI label="EC" value={env.dbEC} unit="mS" c={P.cyan} onChange={v=>setEnv(e=>({...e,dbEC:v}))}/>
          <LI label="pH" value={env.dbPH} unit="pH" c={P.violet} onChange={v=>setEnv(e=>({...e,dbPH:v}))}/>
        </div></div>
    </Glass>
  </div>)}

  {/* ── TAB: 경보 ── */}
  {et==="alarm"&&(
  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:5}}>
    <Glass>
      <SH icon="🚨" title="경보 한계값" sub="EC / pH 상·하한" c={P.red}/>
      {[{l:"▲ 경보 상한",icon:"🔴",c:P.red,ec:env.ahEC,ph:env.ahPH,d:"초과 시 경보 발생",ek:"ahEC",pk:"ahPH"},
        {l:"▼ 경보 하한",icon:"🟡",c:P.amber,ec:env.alEC,ph:env.alPH,d:"미달 시 경보 발생",ek:"alEC",pk:"alPH"},
        {l:"⛔ 작동 하한",icon:"🟠",c:P.orange,ec:env.olEC,ph:env.olPH,d:"미달 시 제어 중단",ek:"olEC",pk:"olPH"}].map((row,i)=>(
        <div key={i} style={{padding:"8px 10px",borderRadius:8,background:`${row.c}05`,border:`1px solid ${row.c}15`,marginBottom:5}}>
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:700,color:row.c}}>{row.icon} {row.l}</span>
            <span style={{fontSize:7,color:P.t4}}>— {row.d}</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div style={{textAlign:"center",padding:"6px",borderRadius:6,background:`${row.c}08`}}>
              <div style={{fontSize:8,color:P.t4}}>EC (mS/cm)</div>
              <span style={{fontSize:20,fontWeight:800,fontFamily:FN,color:row.c}}>{row.ec}</span>
              <div style={{marginTop:3}}><LI value={row.ec} unit="mS" c={row.c} onChange={v=>setEnv(e=>({...e,[row.ek]:v}))}/></div></div>
            <div style={{textAlign:"center",padding:"6px",borderRadius:6,background:`${row.c}08`}}>
              <div style={{fontSize:8,color:P.t4}}>pH</div>
              <span style={{fontSize:20,fontWeight:800,fontFamily:FN,color:row.c}}>{row.ph}</span>
              <div style={{marginTop:3}}><LI value={row.ph} unit="pH" c={row.c} onChange={v=>setEnv(e=>({...e,[row.pk]:v}))}/></div></div>
          </div>
        </div>))}
    </Glass>
    <Glass>
      <SH icon="📊" title="EC 범위 시각화" c={P.cyan}/>
      <div style={{position:"relative",height:40,borderRadius:6,overflow:"hidden",background:P.s0,border:`1px solid ${P.b0}`,marginBottom:8}}>
        <div style={{position:"absolute",left:0,width:`${(env.olEC/5)*100}%`,height:"100%",background:`${P.t4}08`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:7,color:P.t4}}>제어중단</span></div>
        <div style={{position:"absolute",left:`${(env.olEC/5)*100}%`,width:`${((env.alEC-env.olEC)/5)*100}%`,height:"100%",background:`${P.orange}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:7,color:P.orange}}>경고</span></div>
        <div style={{position:"absolute",left:`${(env.alEC/5)*100}%`,width:`${((env.ahEC-env.alEC)/5)*100}%`,height:"100%",background:`${P.green}10`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:9,color:P.green,fontWeight:700}}>✓ 정상</span></div>
        <div style={{position:"absolute",left:`${(env.ahEC/5)*100}%`,right:0,height:"100%",background:`${P.red}10`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:7,color:P.red}}>경보</span></div>
        <div style={{position:"absolute",left:`${(L.ec/5)*100}%`,top:0,bottom:0,width:3,background:P.cyan,boxShadow:`0 0 8px ${P.cyan}`,transition:"left .8s",borderRadius:1}}/>
      </div>
      {/* Scale */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        {[0,1,2,3,4,5].map(v=>(
          <span key={v} style={{fontSize:7,color:P.t4,fontFamily:FN}}>{v.toFixed(1)}</span>))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <span style={{fontSize:9,color:P.t3}}>현재 EC</span>
        <span style={{fontSize:22,fontWeight:800,fontFamily:FN,color:P.cyan}}>{L.ec}</span>
        <span style={{fontSize:9,color:P.t4}}>mS/cm</span>
      </div>
      {/* Legend */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
        {[{l:"작동하한",v:env.olEC,c:P.orange},{l:"경보하한",v:env.alEC,c:P.amber},
          {l:"경보상한",v:env.ahEC,c:P.red},{l:"현재값",v:L.ec,c:P.cyan}].map((m,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 5px",borderRadius:4,background:`${m.c}06`}}>
            <Dot c={m.c} s={5}/><span style={{fontSize:8,color:P.t3}}>{m.l}</span>
            <span style={{fontSize:10,fontWeight:700,fontFamily:FN,color:m.c,marginLeft:"auto"}}>{m.v}</span></div>))}
      </div>
    </Glass>
  </div>)}

  {/* ── TAB: 설비/시스템 ── */}
  {et==="equip"&&(
  <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:5}}>
    <Glass>
      <SH icon="💊" title="약품/단위" c={P.red}/>
      <div style={{padding:"8px",borderRadius:7,background:`${P.red}04`,border:`1px solid ${P.red}12`,marginBottom:6}}>
        <div style={{fontSize:9,fontWeight:700,color:P.red,marginBottom:4}}>산/알칼리 선택</div>
        <LI value={env.acid} c={P.red} onChange={v=>setEnv(e=>({...e,acid:v}))}/></div>
      <div style={{padding:"8px",borderRadius:7,background:`${P.teal}04`,border:`1px solid ${P.teal}12`,marginBottom:6}}>
        <div style={{fontSize:9,fontWeight:700,color:P.teal,marginBottom:4}}>유량 단위</div>
        <LI value={env.flowU} c={P.teal} onChange={v=>setEnv(e=>({...e,flowU:v}))}/></div>
      <div style={{padding:"8px",borderRadius:7,background:`${P.amber}04`,border:`1px solid ${P.amber}12`}}>
        <div style={{fontSize:9,fontWeight:700,color:P.amber,marginBottom:4}}>☀️ 최소 일사량</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={{fontSize:20,fontWeight:800,fontFamily:FN,color:P.amber}}>{env.minS}</span>
          <span style={{fontSize:9,color:P.t4}}>W/m²</span></div>
        <LI value={env.minS} unit="W/m²" c={P.amber} onChange={v=>setEnv(e=>({...e,minS:v}))}/></div>
    </Glass>
    <Glass>
      <SH icon="🔄" title="교반기 / 온도" c={P.green}/>
      <div style={{padding:"8px",borderRadius:7,background:`${P.green}04`,border:`1px solid ${P.green}12`,marginBottom:6}}>
        <div style={{fontSize:9,fontWeight:700,color:P.green,marginBottom:4}}>교반기 주기 (분:초)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div style={{textAlign:"center"}}><span style={{fontSize:18,fontWeight:800,fontFamily:FN,color:P.green}}>{env.agOn}</span>
            <LI label="작동" value={env.agOn} c={P.green} onChange={v=>setEnv(e=>({...e,agOn:v}))}/></div>
          <div style={{textAlign:"center"}}><span style={{fontSize:18,fontWeight:800,fontFamily:FN,color:P.t2}}>{env.agOff}</span>
            <LI label="정지" value={env.agOff} onChange={v=>setEnv(e=>({...e,agOff:v}))}/></div>
        </div></div>
      <div style={{padding:"8px",borderRadius:7,background:`${P.blue}04`,border:`1px solid ${P.blue}12`}}>
        <div style={{fontSize:9,fontWeight:700,color:P.blue,marginBottom:4}}>🌡️ 온도 설정</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div style={{textAlign:"center"}}><span style={{fontSize:18,fontWeight:800,fontFamily:FN,color:P.cyan}}>{env.tR}<span style={{fontSize:9}}>℃</span></span>
            <LI label="원수" value={`${env.tR}`} unit="℃" c={P.cyan} onChange={v=>setEnv(e=>({...e,tR:v}))}/></div>
          <div style={{textAlign:"center"}}><span style={{fontSize:18,fontWeight:800,fontFamily:FN,color:P.amber}}>{env.tO}<span style={{fontSize:9}}>℃</span></span>
            <LI label="외부" value={`${env.tO}`} unit="℃" c={P.amber} onChange={v=>setEnv(e=>({...e,tO:v}))}/></div>
        </div></div>
    </Glass>
    <Glass>
      <SH icon="ℹ️" title="시스템 정보" c={P.t3}/>
      {[{l:"제어기",v:"HydroControl Pro v3.0",c:P.cyan},{l:"Node-RED",v:"v3.1.0",c:P.red},
        {l:"MQTT",v:"Mosquitto 2.0",c:P.green},{l:"DB",v:"InfluxDB 2.7",c:P.violet},
        {l:"밸브",v:`${env.valveCount}개`,c:P.green},{l:"도싱탱크",v:`${env.tankCount}개`,c:P.violet},
        {l:"통신",v:"ESP32↔MQTT↔RPi4",c:P.blue}].map((row,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",
          borderBottom:i<6?`1px solid ${P.b0}10`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <Dot c={row.c} s={4}/><span style={{fontSize:9,color:P.t3}}>{row.l}</span></div>
          <span style={{fontSize:9,fontWeight:700,color:P.t1,fontFamily:FN}}>{row.v}</span></div>))}
    </Glass>
  </div>)}
</div>);})()}

      </main>

      {/* MOBILE BOTTOM TAB BAR */}
      {mob&&<nav style={{position:"fixed",bottom:0,left:0,right:0,height:56,
        background:`${P.s0}f5`,borderTop:`1px solid ${P.glassBorder}`,backdropFilter:"blur(16px)",
        display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100,padding:"0 4px"}}>
        {pages.map(p=>(
          <div key={p.id} onClick={()=>setPg(p.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            padding:"4px 8px",borderRadius:8,cursor:"pointer",minWidth:50,
            background:pg===p.id?`${P.cyan}12`:"transparent",transition:"all .15s"}}>
            <span style={{fontSize:18}}>{p.icon}</span>
            <span style={{fontSize:9,fontWeight:700,color:pg===p.id?P.cyan:P.t4}}>{p.l}</span>
          </div>))}
      </nav>}

      <Toast msg={toast.msg} type={toast.type} visible={toast.show}/>
    </div>);
}
