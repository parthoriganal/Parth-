import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

// ── config ──────────────────────────────────────────────────────────────────
const API = ""; // same origin via Vite proxy to Flask 5000; production serves from same host
let lastResearch = null;
let charts = {};

// sidebar
const sidebar = document.getElementById("sidebar");
document.getElementById("btnOpenSidebar").onclick = ()=> sidebar.classList.add("open");
document.getElementById("btnCloseSidebar").onclick = ()=> sidebar.classList.remove("open");
document.querySelectorAll(".nav-item[data-view]").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const v = btn.dataset.view;
    document.querySelectorAll(".view").forEach(s=>s.classList.remove("active"));
    document.getElementById("view-"+v).classList.add("active");
    sidebar.classList.remove("open");
    if(v==="trends" && lastResearch) renderTrendsView();
    if(v==="profit" && lastResearch) renderProfit();
    if(v==="results" && lastResearch) renderResults();
  };
});

// health
async function checkHealth(){
  const dot=document.getElementById("statusDot"), sub=document.getElementById("statusSub");
  try{
    const r=await fetch(API+"/api/health");
    const j=await r.json();
    dot.className="status-dot ok";
    sub.textContent=`API v${j.version} • ${Object.keys(j.marketplaces||{}).length||6} marketplaces`;
    if(j.dataforseo_configured) sub.textContent+=" • DataForSEO ✓";
    if(j.pangolinfo_configured) sub.textContent+=" • Pangolinfo ✓";
  }catch(e){
    dot.className="status-dot bad";
    sub.textContent="API offline — run backend";
  }
}
checkHealth();

// marketplace pill sync
const mpSelect=document.getElementById("inpMarketplace");
const pill=document.getElementById("marketplacePill");
const symMap={us:"$",uk:"£",ca:"C$",au:"A$",de:"€",in:"₹"};
function syncPill(){ const v=mpSelect.value; pill.textContent=v.toUpperCase()+" • "+(symMap[v]||"$");}
mpSelect.addEventListener("change", syncPill); syncPill();

// form helpers
function getForm(){
  const seedsRaw=document.getElementById("inpSeeds").value.trim();
  const seeds=seedsRaw.split(/\n/).map(s=>s.trim()).filter(Boolean);
  return {
    title: document.getElementById("inpTitle").value.trim(),
    subtitle: document.getElementById("inpSubtitle").value.trim(),
    seeds,
    marketplace: document.getElementById("inpMarketplace").value,
    format: document.getElementById("inpFormat").value,
    price: document.getElementById("inpPrice").value ? parseFloat(document.getElementById("inpPrice").value) : null,
    pages: parseInt(document.getElementById("inpPages").value||"220",10),
    department: document.getElementById("inpDept").value,
    depth: parseInt(document.getElementById("inpDepth").value,10),
    asins: document.getElementById("inpASINs").value.trim() ? document.getElementById("inpASINs").value.split(/[, \n]+/).map(s=>s.trim().toUpperCase()).filter(Boolean) : [],
  };
}
function toast(msg, ms=2800){
  const t=document.getElementById("toast");
  t.textContent=msg; t.hidden=false;
  setTimeout(()=> t.hidden=true, ms);
}
function showLoading(show, title, sub, pct){
  const el=document.getElementById("loading");
  if(show){
    document.getElementById("loadingTitle").textContent=title||"Mining keywords…";
    document.getElementById("loadingSub").textContent=sub||"Amazon autocomplete • Please wait";
    document.getElementById("loadingBar").style.width=(pct!=null?pct:8)+"%";
    document.getElementById("loadingDetail").textContent="Rate-limited to respect Amazon ToS. This can take 15-35s.";
    el.hidden=false;
  }else el.hidden=true;
}

// demo
document.getElementById("btnDemo").onclick=()=>{
  document.getElementById("inpTitle").value="The Silent Library";
  document.getElementById("inpSubtitle").value="A Cozy Mystery with Recipes";
  document.getElementById("inpSeeds").value="cozy mystery\ncozy crime fiction\nculinary mystery\nbookshop mystery";
  document.getElementById("inpMarketplace").value="us"; syncPill();
  document.getElementById("inpFormat").value="ebook";
  document.getElementById("inpPrice").value="4.99";
  document.getElementById("inpPages").value="280";
  document.getElementById("inpDept").value="kindle";
  document.getElementById("inpDepth").value="1";
  document.getElementById("inpASINs").value="B0C3XYZ123, B08N5WRWNW";
  toast("Demo loaded — click Run Full Research");
};

// ── Run Research ─────────────────────────────────────────────────────────────
async function runResearch(){
  const f=getForm();
  if(!f.seeds.length){ toast("Enter at least 1 seed keyword"); document.getElementById("inpSeeds").focus(); return; }
  if(f.seeds.length>10){ toast("Max 10 seeds"); return; }
  if(f.asins.length>8){ toast("Max 8 ASINs"); return; }

  document.getElementById("researchStatus").textContent="Running…";
  showLoading(true,"Mining keywords…","Amazon autocomplete + competition probe", 12);

  try{
    let pct=12;
    const t=setInterval(()=>{ pct=Math.min(88, pct+ (Math.random()*6)); document.getElementById("loadingBar").style.width=pct+"%"; }, 1800);

    const res=await fetch(API+"/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      title:f.title, subtitle:f.subtitle, seeds:f.seeds, marketplace:f.marketplace,
      format:f.format, price:f.price, pages:f.pages, asins:f.asins, department:f.department, depth:f.depth
    })});
    clearInterval(t);
    document.getElementById("loadingBar").style.width="100%";
    if(!res.ok){
      const err=await res.json().catch(()=>({error: res.statusText}));
      throw new Error(err.error||`HTTP ${res.status}`);
    }
    const data=await res.json();
    lastResearch=data;

    // save to localStorage
    localStorage.setItem("kdp_last_research", JSON.stringify(data));

    showLoading(false);
    document.getElementById("researchStatus").textContent=`Done in ${data.meta.elapsed_s}s • ${data.meta.total_mined} keywords • Overall ${data.scored.overall}/100`;
    toast(`Research complete — Overall ${data.scored.overall}/100 • ${data.meta.total_mined} keywords`);

    renderAll(data);
    // switch to dashboard
    document.querySelector('[data-view="results"]').click();
  }catch(e){
    showLoading(false);
    document.getElementById("researchStatus").textContent="Failed";
    toast("Research failed: "+e.message, 5000);
    console.error(e);
  }
}
document.getElementById("btnResearchSubmit").onclick=runResearch;
document.getElementById("btnRunResearch").onclick=runResearch;

// try restore last
try{
  const saved=JSON.parse(localStorage.getItem("kdp_last_research")||"null");
  if(saved){ lastResearch=saved; renderAll(saved); }
}catch{}

// ── Renderers ───────────────────────────────────────────────────────────────
function renderAll(data){
  renderHero(data);
  renderScatter(data);
  renderBars(data);
  renderIntent(data);
  renderCompetitionChart(data);
  renderLowComp(data);
  renderKeywords(data);
  renderTop20(data);
  renderCompetitorBooks(data);
  renderCategories(data);
  renderContentGap(data);
  renderProfit(data);
  renderReport(data);
  renderTrendsView();
}

function renderHero(d){
  const empty=document.getElementById("emptyState");
  const content=document.getElementById("resultsContent");
  if(!d){ empty.hidden=false; content.hidden=true; return; }
  empty.hidden=true; content.hidden=false;

  const overall=d.scored.overall;
  const label=d.scored.overall_label;
  document.getElementById("overallScore").textContent=overall+"/100";
  document.getElementById("overallLabel").textContent=label;
  document.getElementById("overallBar").style.width=overall+"%";
  document.getElementById("overallBar").style.background = overall>=60? "linear-gradient(90deg,#10b981,#38bdf8)": overall>=45? "linear-gradient(90deg,#eab308,#f97316)":"linear-gradient(90deg,#f97316,#ef4444)";
  document.getElementById("overallFormula").textContent=d.scored.formula;

  const s=d.input;
  document.getElementById("summaryKv").innerHTML=`
    <div><b>Seeds</b><span>${d.input.seeds.join(", ")}</span></div>
    <div><b>Marketplace</b><span>${d.meta.marketplace_meta.code.toUpperCase()} • ${d.meta.marketplace_meta.symbol}</span></div>
    <div><b>Mined</b><span>${d.meta.total_mined} keywords</span></div>
    <div><b>Time</b><span>${d.meta.elapsed_s}s • ${d.meta.updated_at.slice(0,19).replace("T"," ") } UTC</span></div>
  `;
  document.getElementById("sourcePills").innerHTML=`
    <span class="pill">📦 ${d.sources.keywords}</span>
    <span class="pill">📊 ${d.sources.competition}</span>
    <span class="pill">💰 ${d.sources.profit}</span>
    <span class="pill">🧮 ${d.sources.score}</span>
  `;
}

function destroy(id){ if(charts[id]){ try{charts[id].destroy();}catch{} delete charts[id]; } }

function renderScatter(d){
  destroy("scatter");
  const ctx=document.getElementById("chartScatter");
  if(!ctx) return;
  const pts=d.scored.keywords.slice(0,40).map(k=>{
    const mined=d.mined.find(m=>m.keyword===k.keyword);
    return {x: mined? mined.demand_signal: 50, y: k.total, label:k.keyword};
  });
  charts.scatter=new Chart(ctx,{
    type:"scatter",
    data:{ datasets:[{label:"Keywords", data:pts, backgroundColor: pts.map(p=> p.y>=60?"#10b981": p.y>=45? "#eab308":"#ef4444"), pointRadius:6, pointHoverRadius:8 }] },
    options:{
      responsive:true, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=> `${ctx.raw.label} — demand ${ctx.raw.x}, score ${ctx.raw.y}`}} },
      scales:{
        x:{ title:{display:true,text:"Demand signal (ESTIMATED 0-100)",color:"#8a97ad"}, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"} },
        y:{ title:{display:true,text:"Opportunity 0-100",color:"#8a97ad"}, min:0,max:100, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"} }
      }
    }
  });
}

function renderBars(d){
  destroy("bars");
  const ctx=document.getElementById("chartBars");
  const top=d.scored.keywords.slice(0,8);
  charts.bars=new Chart(ctx,{
    type:"bar",
    data:{
      labels: top.map(t=> t.keyword.length>28? t.keyword.slice(0,28)+"…": t.keyword),
      datasets:[{label:"Opportunity", data: top.map(t=>t.total), backgroundColor: top.map(t=> t.total>=60?"#10b981": t.total>=45?"#eab308":"#ef4444"), borderRadius:8 }]
    },
    options:{
      indexAxis:"y", responsive:true,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ title:items=> top[items[0].dataIndex].keyword }} },
      scales:{
        x:{ min:0,max:100, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"}},
        y:{ grid:{display:false}, ticks:{color:"#8a97ad", font:{size:11}}}
      }
    }
  });
}

function renderIntent(d){
  destroy("intent");
  const ctx=document.getElementById("chartIntent");
  const buckets={};
  d.mined.forEach(m=>{ buckets[m.intent_bucket]=(buckets[m.intent_bucket]||0)+1; });
  charts.intent=new Chart(ctx,{
    type:"doughnut",
    data:{
      labels:Object.keys(buckets),
      datasets:[{ data:Object.values(buckets), backgroundColor:["#38bdf8","#10b981","#8b5cf6","#f59e0b","#ef4444"], borderWidth:0 }]
    },
    options:{ responsive:true, plugins:{ legend:{ position:"bottom", labels:{color:"#8a97ad", boxWidth:12}}}}
  });
}

function renderCompetitionChart(d){
  destroy("competition");
  const ctx=document.getElementById("chartCompetition");
  const withComp=d.mined.filter(m=> m.result_count!=null).slice(0,10);
  const labels=withComp.map(m=> m.keyword.length>20? m.keyword.slice(0,20)+"…": m.keyword);
  charts.competition=new Chart(ctx,{
    type:"bar",
    data:{ labels, datasets:[{ label:"Results", data: withComp.map(m=>m.result_count||0), backgroundColor:"rgba(56,189,248,.6)", borderRadius:8 }] },
    options:{
      responsive:true, plugins:{ legend:{display:false}},
      scales:{ y:{ grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"}}, x:{ grid:{display:false}, ticks:{color:"#8a97ad", maxRotation:30}} }
    }
  });
}

function renderLowComp(d){
  const el=document.getElementById("lowCompList");
  const low=d.low_competition||[];
  if(!low.length){ el.innerHTML='<span class="muted">No low-competition gems yet — try broader seeds or wait for competitor data.</span>'; return; }
  el.innerHTML=low.map(k=> `<span class="chip"><b>${k.total}</b> ${k.keyword}</span>`).join("");
}

function renderKeywords(d){
  const tbody=document.getElementById("kwTbody");
  const meta=document.getElementById("kwMeta");
  const scoreMap=new Map(d.scored.keywords.map(k=>[k.keyword,k]));
  function rows(list){
    if(!list.length) return '<tr><td colspan="9" class="muted">No keywords match.</td></tr>';
    return list.map((m,i)=>{
      const s=scoreMap.get(m.keyword);
      const total=s? s.total: "—";
      const color=s? s.color:"#64748b";
      return `<tr>
        <td>${i+1}</td>
        <td><b>${m.keyword}</b></td>
        <td class="muted">${m.seed}</td>
        <td>${m.position}</td>
        <td><span class="tag tag-est">${m.demand_signal}</span></td>
        <td>${m.result_count!=null? m.result_count.toLocaleString(): "—"}</td>
        <td><span class="chip" style="border-color:${color};color:${color}">${total}</span></td>
        <td class="muted" style="font-size:.78rem">${m.intent_bucket}</td>
        <td><span class="tag ${m.competition_status==="ACTUAL"?"tag-ok": m.competition_status==="not_probed"?"tag-na":"tag-warn"}">${m.competition_status||"—"}</span></td>
      </tr>`;
    }).join("");
  }
  let current=[...d.mined];
  function apply(){
    const q=(document.getElementById("kwFilter").value||"").toLowerCase();
    let list=current.filter(m=> !q || m.keyword.toLowerCase().includes(q));
    const sort=document.getElementById("kwSort").value;
    if(sort==="opportunity"){ list.sort((a,b)=> (scoreMap.get(b.keyword)?.total||0)-(scoreMap.get(a.keyword)?.total||0)); }
    else if(sort==="demand"){ list.sort((a,b)=> b.demand_signal - a.demand_signal); }
    else if(sort==="position"){ list.sort((a,b)=> a.position-b.position); }
    else if(sort==="alpha"){ list.sort((a,b)=> a.keyword.localeCompare(b.keyword)); }
    tbody.innerHTML=rows(list);
    meta.textContent=`${list.length} shown • ${d.meta.total_mined} total • source: ${d.sources.keywords}`;
  }
  document.getElementById("kwFilter").oninput=apply;
  document.getElementById("kwSort").onchange=apply;
  apply();
}

function renderTop20(d){
  const badge=document.getElementById("top20Badge");
  const tbody=document.getElementById("top20Tbody");
  if(!d.top20 || !d.top20.length){
    badge.textContent="No search results (blocked or empty)";
    tbody.innerHTML='<tr><td colspan="7" class="muted">Top 20 unavailable — Amazon search was blocked or returned no items. Use competitor ASINs for BSR analysis.</td></tr>';
    return;
  }
  badge.textContent=d.mined[0]? `for "${d.mined[0].keyword}"`:"Top 20";
  tbody.innerHTML=d.top20.map((r,i)=> `<tr>
    <td>${i+1}</td><td class="mono">${r.asin}</td><td>${r.title||"—"}</td>
    <td>${r.price!=null? "$"+r.price.toFixed(2): "—"}</td><td>${r.rating||"—"}</td><td>${r.review_count!=null? r.review_count.toLocaleString(): "—"}</td><td>${r.sponsored?'<span class="tag tag-warn">Sponsored</span>':'—'}</td>
  </tr>`).join("");
  // update BSR vs review charts if we have competitor books instead
}

function renderCompetitorBooks(d){
  const el=document.getElementById("trackedList");
  const books=d.competitors.books||[];
  const stats=d.competitors.stats;
  if(!books.length){ el.innerHTML='<span class="muted">No competitor ASINs provided. Add 1–8 ASINs on the Research tab to unlock BSR, price, rating, page count, and category data.</span>'; destroy("bsr"); destroy("reviews"); return; }

  el.innerHTML=books.map(b=>{
    if(b.status!=="ok") return `<div class="book-card" style="border-color:#ef4444"><h4>${b.asin}</h4><div class="tiny">❌ ${b.error||b.status}</div><div class="tiny">${b.status==="blocked"?"Amazon blocked product page — try again later or use proxy.":""}</div></div>`;
    return `<div class="book-card">
      <h4>${b.title||"Untitled"}</h4>
      <div class="tiny">${b.author||"Unknown author"} • ${b.publication_date||""}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">
        <span class="tag ${b.bsr? "tag-ok":"tag-na"}">BSR ${b.bsr? "#"+b.bsr.toLocaleString(): "—"}</span>
        <span class="tag tag-ok">${b.price!=null? "$"+b.price.toFixed(2): "Price —"}</span>
        <span class="tag tag-est">★ ${b.rating||"—"} • ${b.review_count!=null? b.review_count.toLocaleString()+" reviews":"—"}</span>
        <span class="pill">${b.pages||"?"} pages</span>
      </div>
      <div class="tiny">Categories: ${(b.categories||[]).join(" › ")|| (Object.keys(b.bsr_categories||{}).slice(0,2).join(" • ")||"—")}</div>
      ${b.est_daily_sales!=null? `<div class="tiny">Est. sales: ${b.est_daily_sales}/day • ${b.est_monthly_revenue_usd? "$"+b.est_monthly_revenue_usd+"/mo":""} (power-law model)</div>`:""}
    </div>`;
  }).join("");

  // BSR chart
  destroy("bsr");
  const bsrBooks=books.filter(b=>b.status==="ok" && b.bsr).slice(0,10);
  if(bsrBooks.length){
    const ctx=document.getElementById("chartBSR");
    charts.bsr=new Chart(ctx,{
      type:"bar",
      data:{
        labels: bsrBooks.map(b=> b.asin),
        datasets:[{ label:"BSR (lower = sells more)", data: bsrBooks.map(b=>b.bsr), backgroundColor:"rgba(16,185,129,.7)", borderRadius:8 }]
      },
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ y:{ type:"logarithmic", grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"}}, x:{ ticks:{color:"#8a97ad"}}}}
    });
  }
  destroy("reviews");
  const revBooks=books.filter(b=>b.status==="ok" && b.review_count!=null);
  if(revBooks.length){
    const ctx=document.getElementById("chartReviews");
    charts.reviews=new Chart(ctx,{
      type:"scatter",
      data:{ datasets:[{ label:"Books", data: revBooks.map(b=>({x:b.review_count,y:b.rating||0, asin:b.asin})), backgroundColor:"#8b5cf6", pointRadius:7 }] },
      options:{ responsive:true, plugins:{ tooltip:{ callbacks:{ label:ctx=> `${ctx.raw.asin}: ${ctx.raw.x} reviews, ★${ctx.raw.y}`}}}, scales:{ x:{ title:{display:true,text:"Reviews",color:"#8a97ad"}, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"}}, y:{ min:3,max:5, title:{display:true,text:"Rating",color:"#8a97ad"}, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"}}}}
    });
  }
}

function renderCategories(d){
  const fromEl=document.getElementById("categoryFrom");
  const sugEl=document.getElementById("categorySuggested");
  const from=d.categories?.from_competitors||[];
  const sug=d.categories?.suggested||[];
  fromEl.innerHTML= from.length? `<div class="tiny" style="margin-bottom:6px">From competitor BSR trees & breadcrumbs — ACTUAL</div>`+ from.slice(0,18).map(c=> `<span class="cat-pill">${c.category}${c.rank? " • #"+c.rank.toLocaleString():""}</span>`).join("") : '<span class="muted">No competitor categories — provide ASINs.</span>';
  sugEl.innerHTML= sug.length? `<div class="tiny" style="margin-bottom:6px">Suggested for your niche</div>`+ sug.map(c=> `<span class="cat-pill">${c.category} → ${c.subcategories.slice(0,3).join(", ")}</span>`).join("") : "";
}

function renderContentGap(d){
  const summary=document.getElementById("gapSummary");
  const list=document.getElementById("gapList");
  const g=d.content_gap;
  if(!g || g.status==="unavailable"){
    summary.textContent=g?.reason||"Add competitor ASINs to run content gap.";
    list.innerHTML="";
    return;
  }
  summary.textContent=g.summary;
  summary.className="tiny";
  if(!g.gaps.length){ list.innerHTML='<div class="muted" style="margin-top:8px">No high gaps — well-covered niche.</div>'; return; }
  list.style.marginTop="10px";
  list.innerHTML= g.gaps.map(gap=> `<div class="book-card" style="margin-bottom:8px;display:flex;justify-content:space-between;gap:10px;align-items:center">
    <div><b>${gap.topic}</b> <span class="tag ${gap.opportunity==="High"?"tag-ok": gap.opportunity==="Medium"?"tag-est":"tag-warn"}">${gap.opportunity}</span><div class="tiny">Demand ${gap.demand_mentions} • Competitor ${gap.competitor_mentions} • e.g., ${gap.example_keywords.join(", ")}</div></div>
    <div style="font-weight:800;color:var(--accent)">${gap.gap_score}</div>
  </div>`).join("") + `<div class="tiny" style="margin-top:8px">${g.method}</div>`;
}

let profitChart=null;
function renderProfit(d){
  if(!d) return;
  const profit=d.profit;
  const price=d.input.price;
  const pages=d.input.pages||220;
  const hero=document.getElementById("profitHero");
  const tbody=document.getElementById("profitTbody");
  const note=document.getElementById("profitNote");
  if(!profit || price==null){
    // show input-driven calculator
    const p=parseFloat(document.getElementById("profitPrice").value||"");
    if(isNaN(p)){ tbody.innerHTML='<tr><td colspan="4" class="muted">Set a selling price to calculate royalties.</td></tr>'; hero.innerHTML=""; return; }
  }
  // update hero
  if(profit){
    hero.innerHTML=`
      <div class="profit-box"><div class="label">eBook</div><div class="value">$${profit.ebook.royalty}</div><div class="tiny">${profit.ebook.rate_label} • ${profit.ebook.note}</div></div>
      <div class="profit-box"><div class="label">Paperback</div><div class="value">$${profit.paperback.royalty}</div><div class="tiny">${profit.paperback.rate_label} • printing $${profit.paperback.printing_cost}</div></div>
      <div class="profit-box"><div class="label">Hardcover</div><div class="value">$${profit.hardcover.royalty}</div><div class="tiny">${profit.hardcover.rate_label} • printing $${profit.hardcover.printing_cost}</div></div>
    `;
  }
  // ladder
  const ladder=[0.99,1.99,2.99,3.99,4.99,5.99,6.99,7.99,9.99,12.99,14.99];
  // fetch latest profit table via API for hero price
  // Use cached or compute client-side
  function ebookRoyalty(pr){ if(pr==null) return 0; if(pr>=2.99&&pr<=9.99) return +(pr*0.70-0.15).toFixed(2); return +(pr*0.35).toFixed(2); }
  function pbRoyalty(pr, pg=220){ const cost=0.85+pg*0.012; return +(pr*0.60 - cost).toFixed(2); }
  tbody.innerHTML=ladder.map(pr=> {
    const tag = pr>=2.99&&pr<=9.99 ? '<span class="tag tag-ok">70%</span>' : '<span class="tag tag-warn">35%</span>';
    return `<tr><td><b>$${pr.toFixed(2)}</b></td><td>$${Math.max(0,ebookRoyalty(pr)).toFixed(2)} ${tag}</td><td>$${Math.max(0,pbRoyalty(pr,pages)).toFixed(2)}</td><td>$${Math.max(0,+(pr*0.60 -(4.50+pages*0.012)).toFixed(2)).toFixed(2)}</td></tr>`;
  }).join("");
  note.textContent="eBook: 70% $2.99-$9.99 minus ~$0.15 delivery, else 35%. Paperback: 60% minus printing ($0.85 + $0.012/page B&W). Hardcover: 60% minus $4.50 + $0.012/page. Source: KDP royalty tables — CALCULATED.";

  // chart
  destroy("profit");
  const ctx=document.getElementById("chartProfit");
  const royalties=ladder.map(p=> Math.max(0, ebookRoyalty(p)));
  charts.profit=new Chart(ctx,{ type:"line", data:{ labels: ladder.map(p=>"$"+p), datasets:[{label:"eBook royalty", data:royalties, borderColor:"#38bdf8", backgroundColor:"rgba(56,189,248,.15)", fill:true, tension:.35, pointRadius:4 }]}, options:{ responsive:true, plugins:{ legend:{display:false}}, scales:{ y:{ grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"} }, x:{ grid:{display:false}, ticks:{color:"#8a97ad"}}}}});
}

document.getElementById("btnRecalcProfit").onclick=async ()=>{
  const price=parseFloat(document.getElementById("profitPrice").value);
  const pages=parseInt(document.getElementById("profitPages").value||"220",10);
  if(isNaN(price)){ toast("Enter a price"); return; }
  const form=getForm();
  try{
    const r=await fetch(API+"/api/profit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({price,pages, marketplace:form.marketplace})});
    const j=await r.json();
    // update lastResearch profit for report
    if(lastResearch){ lastResearch.profit=j.breakdown? {ebook:j.breakdown.ebook, paperback:j.breakdown.paperback, hardcover:j.breakdown.hardcover} : lastResearch.profit; }
    // re-render profit with new values
    const ladder=j.ladder;
    const tbody=document.getElementById("profitTbody");
    tbody.innerHTML=ladder.map(row=> `<tr><td><b>$${row.price.toFixed(2)}</b></td><td>$${row.ebook_royalty.toFixed(2)} <span class="tag ${row.ebook_rate==="70%"?"tag-ok":"tag-warn"}">${row.ebook_rate}</span></td><td>$${row.paperback_royalty.toFixed(2)}</td><td>$${row.hardcover_royalty.toFixed(2)}</td></tr>`).join("");
    document.getElementById("profitHero").innerHTML=`
      <div class="profit-box"><div class="label">eBook</div><div class="value">$${j.breakdown.ebook.royalty}</div><div class="tiny">${j.breakdown.ebook.rate_label} • ${j.breakdown.ebook.note}</div></div>
      <div class="profit-box"><div class="label">Paperback</div><div class="value">$${j.breakdown.paperback.royalty}</div><div class="tiny">${j.breakdown.paperback.rate_label} • printing $${j.breakdown.paperback.printing_cost}</div></div>
      <div class="profit-box"><div class="label">Hardcover</div><div class="value">$${j.breakdown.hardcover.royalty}</div><div class="tiny">${j.breakdown.hardcover.rate_label} • printing $${j.breakdown.hardcover.printing_cost}</div></div>
    `;
    toast("Profit recalculated");
  }catch(e){ toast("Profit calc failed: "+e.message); }
};

// ── Trends ──────────────────────────────────────────────────────────────────
async function renderTrendsView(){
  if(!lastResearch) return;
  const picker=document.getElementById("trendPicker");
  // populate
  const kws=lastResearch.mined.slice(0,20);
  if(picker.options.length<=1){
    kws.forEach(k=>{ const o=document.createElement("option"); o.value=k.keyword; o.textContent=k.keyword; picker.appendChild(o); });
    if(kws.length) picker.value=kws[0].keyword;
  }
  if(!picker.value && kws.length) picker.value=kws[0].keyword;
  if(picker.value) await loadTrend(picker.value);

  // mini comparison for top 3
  const mini=document.getElementById("trendMini");
  if(mini){
    const top3=lastResearch.scored.keywords.slice(0,3).map(s=> s.keyword);
    mini.innerHTML=top3.map(k=> `<div class="pill" style="padding:10px"><b>${k}</b><div class="tiny">Loading trend…</div><canvas height="80" data-trend="${k}"></canvas></div>`).join("");
    // Sequentially fetch mini trends (avoid hammer Google)
    for(const kw of top3){
      fetchTrendThenRenderMini(kw);
    }
  }
}
document.getElementById("trendPicker").onchange=(e)=> loadTrend(e.target.value);

let trendCache={};
async function loadTrend(keyword){
  if(!keyword) return;
  const badge=document.getElementById("trendStatusBadge");
  const note=document.getElementById("trendNote");
  badge.textContent="Loading…";
  if(trendCache[keyword]){
    renderTrendChart(trendCache[keyword]);
    badge.textContent=trendCache[keyword].status;
    badge.className="badge "+(trendCache[keyword].status==="ACTUAL"?"tag-ok":"tag-warn");
    note.textContent=trendCache[keyword].note;
    return;
  }
  try{
    const form=getForm();
    const r=await fetch(API+"/api/trends",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword, marketplace: form.marketplace})});
    const j=await r.json();
    trendCache[keyword]=j;
    badge.textContent=j.status;
    badge.className="tag "+(j.status==="ACTUAL"?"tag-ok":"tag-warn");
    note.textContent=j.source+" • "+j.note+" • Updated "+j.last_updated.slice(0,19);
    renderTrendChart(j);
  }catch(e){
    badge.textContent="Failed: "+e.message;
    badge.className="tag tag-bad";
  }
}
function renderTrendChart(j){
  destroy("trends");
  const ctx=document.getElementById("chartTrends");
  charts.trends=new Chart(ctx,{
    type:"line",
    data:{ labels: j.labels, datasets:[{ label: j.keyword, data: j.values, borderColor: j.status==="ACTUAL"?"#10b981":"#38bdf8", backgroundColor: j.status==="ACTUAL"?"rgba(16,185,129,.15)":"rgba(56,189,248,.15)", fill:true, tension:.35, pointRadius:3 }]},
    options:{ responsive:true, plugins:{ legend:{ labels:{color:"#8a97ad"}}}, scales:{ y:{ min:0,max:100, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#8a97ad"}}, x:{ grid:{display:false}, ticks:{color:"#8a97ad"}}}}
  });
}
async function fetchTrendThenRenderMini(kw){
  const el=document.querySelector(`canvas[data-trend="${CSS.escape(kw)}"]`);
  if(!el) return;
  let j=trendCache[kw];
  if(!j){
    const form=getForm();
    try{
      const r=await fetch(API+"/api/trends",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keyword:kw, marketplace: form.marketplace})});
      j=await r.json(); trendCache[kw]=j;
    }catch{ return; }
  }
  // small chart — we keep main trend chart intact, so create inline mini chart per canvas
  new Chart(el,{
    type:"line",
    data:{ labels: j.labels, datasets:[{ data: j.values, borderColor:"#38bdf8", backgroundColor:"rgba(56,189,248,.12)", fill:true, tension:.3, pointRadius:0}]},
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ y:{ display:false, min:0,max:100}, x:{ display:false}} }
  });
  const pill=el.closest(".pill");
  if(pill){ pill.querySelector(".tiny").textContent = `${j.trend_direction} • ${j.status} • peak ${j.peak_month|| j.labels[j.values.indexOf(Math.max(...j.values))]} • ${j.source}`; }
}

// ── Report & Export ─────────────────────────────────────────────────────────
function renderReport(d){
  const el=document.getElementById("reportBody");
  if(!d){ el.innerHTML='<div class="muted">No research yet.</div>'; return; }
  const top=d.scored.keywords.slice(0,10);
  const low=d.low_competition||[];
  el.innerHTML=`
    <h3>Overall: ${d.scored.overall}/100 — ${d.scored.overall_label}</h3>
    <div class="tiny">${d.scored.formula}</div>
    <p>Research for <b>${[d.input.title, d.input.subtitle].filter(Boolean).join(" — ")|| d.input.seeds.join(", ")}</b> on ${d.meta.marketplace_meta.domain} • ${d.meta.total_mined} keywords mined in ${d.meta.elapsed_s}s • ${d.meta.updated_at.slice(0,19).replace("T"," ")} UTC</p>
    <p class="tiny">Sources: ${d.sources.keywords} • ${d.sources.competition} • ${d.sources.profit} • ${d.sources.score}</p>
    <h3>Top 10 Opportunity Keywords</h3>
    <div class="table-wrap"><table class="table"><thead><tr><th>Keyword</th><th>Score</th><th>Demand</th><th>Results</th><th>Explain</th></tr></thead><tbody>
      ${top.map(k=>{
        const mined=d.mined.find(m=>m.keyword===k.keyword);
        const pieces=Object.entries(k.pillars).map(([name, p])=> `${name} ${p.score}/${p.max} — ${p.explain}`).join("<br>");
        return `<tr><td><b>${k.keyword}</b></td><td><span class="chip" style="color:${k.color};border-color:${k.color}">${k.total}</span> ${k.label}</td><td>${mined? mined.demand_signal:"—"}</td><td>${mined?.result_count!=null? mined.result_count.toLocaleString():"—"}</td><td class="tiny" style="max-width:420px">${pieces}</td></tr>`;
      }).join("")}
    </tbody></table></div>
    <h3>Low-Competition Gems</h3>
    <p>${low.length? low.map(k=> `<span class="chip"><b>${k.total}</b> ${k.keyword}</span>`).join(" "): "— none found with current filters"}</p>
    <h3>Competitors</h3>
    <p class="tiny">${d.competitors.stats? `Avg BSR ${d.competitors.stats.avg_bsr?.toLocaleString()||"—"} • Avg price $${d.competitors.stats.avg_price||"—"} • Avg reviews ${d.competitors.stats.avg_reviews?.toLocaleString()||"—"} • ${d.competitors.stats.count} books` : "No ASINs provided."}</p>
    ${d.competitors.books.length? `<div class="table-wrap"><table class="table"><thead><tr><th>ASIN</th><th>Title</th><th>BSR</th><th>Price</th><th>Rating</th><th>Reviews</th></tr></thead><tbody>${d.competitors.books.map(b=> `<tr><td class="mono">${b.asin}</td><td>${b.title||b.error||"—"}</td><td>${b.bsr? "#"+b.bsr.toLocaleString():"—"}</td><td>${b.price!=null? "$"+b.price.toFixed(2):"—"}</td><td>${b.rating||"—"}</td><td>${b.review_count!=null?b.review_count.toLocaleString():"—"}</td></tr>`).join("")}</tbody></table></div>`:""}
    <h3>Content Gaps</h3>
    <p class="tiny">${d.content_gap?.summary||"—"}</p>
    ${d.content_gap?.gaps?.length? d.content_gap.gaps.slice(0,6).map(g=> `<div class="tiny">• <b>${g.topic}</b> — gap ${g.gap_score} (${g.opportunity}) • demand ${g.demand_mentions} vs competitor ${g.competitor_mentions} • e.g., ${g.example_keywords.join(", ")}</div>`).join(""):""}
    <h3>Categories</h3>
    <p class="tiny">From competitors: ${(d.categories.from_competitors||[]).slice(0,8).map(c=>c.category+(c.rank?" #"+c.rank:"")).join(" • ")||"—"}<br>Suggested: ${(d.categories.suggested||[]).slice(0,4).map(c=>c.category).join(" • ")||"—"}</p>
    <h3>Profit at $${d.input.price||"?"} (${d.input.pages||220}p)</h3>
    ${d.profit? `<p>eBook $${d.profit.ebook.royalty} (${d.profit.ebook.rate_label}) • Paperback $${d.profit.paperback.royalty} (printing $${d.profit.paperback.printing_cost}) • Hardcover $${d.profit.hardcover.royalty} (printing $${d.profit.hardcover.printing_cost}) • ${d.profit.ebook.note}${" • "+d.profit.paperback.note}</p>`:"<p class='tiny'>No price provided.</p>"}
    <h3>Errors & Warnings</h3>
    <p class="tiny">${(d.errors||[]).length? d.errors.join("<br>"):"— none"}<br>${(d.warnings||[]).length? d.warnings.join("<br>"):""}</p>
  `;
}

// exports
function toCSV(rows, headers){
  const esc=v=> `"${String(v??"").replace(/"/g,'""')}"`;
  return [headers.map(esc).join(","), ...rows.map(r=> headers.map(h=>esc(r[h])).join(","))].join("\n");
}
function download(name, blob){
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

document.getElementById("btnExportCSV").onclick=()=>{
  if(!lastResearch){ toast("No data to export"); return; }
  const d=lastResearch;
  const scoreMap=new Map(d.scored.keywords.map(k=>[k.keyword,k]));
  const rows=d.mined.map(m=>{
    const s=scoreMap.get(m.keyword);
    return { keyword:m.keyword, seed:m.seed, position:m.position, word_count:m.word_count, demand_signal:m.demand_signal, intent_bucket:m.intent_bucket, result_count:m.result_count ?? "", opportunity:s? s.total:"", label:s? s.label:"", demand_pillars: s? JSON.stringify(s.pillars).slice(0,200):"" , status:m.competition_status, data_source: d.sources.keywords, updated_at: d.meta.updated_at };
  });
  const headers=["keyword","seed","position","word_count","demand_signal","intent_bucket","result_count","opportunity","label","demand_pillars","status","data_source","updated_at"];
  download(`kdp-research-${d.meta.marketplace_meta.code}-${new Date().toISOString().slice(0,10)}.csv`, new Blob([toCSV(rows,headers)],{type:"text/csv"}));
  toast("CSV downloaded");
};
document.getElementById("btnExportKeywordsCSV").onclick=()=> document.getElementById("btnExportCSV").click();
document.getElementById("btnExportPDF").onclick=()=>{
  if(!lastResearch){ toast("No data to export"); return; }
  const d=lastResearch;
  const w=window.open("","_blank");
  const html=`<!doctype html><title>KDP Research Report</title><style>body{font-family:Inter,system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;color:#111} h1{font-size:1.4rem} h2{font-size:1.05rem;margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:4px} table{width:100%;border-collapse:collapse;font-size:.85rem} th,td{border:1px solid #ddd;padding:6px 8px;text-align:left} th{background:#f5f5f5;font-size:.75rem;text-transform:uppercase} .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.75rem;border:1px solid #ddd} .muted{color:#666;font-size:.8rem}</style>
  <h1>KDP Keyword Research Report — Overall ${d.scored.overall}/100 ${d.scored.overall_label}</h1>
  <p class="muted">Seeds: ${d.input.seeds.join(", ")} • Marketplace: ${d.meta.marketplace_meta.code.toUpperCase()} • ${d.meta.total_mined} keywords • ${d.meta.elapsed_s}s • ${d.meta.updated_at} UTC<br>Sources: ${d.sources.keywords} • ${d.sources.competition} • ${d.sources.profit}<br><i>Demand signals are ESTIMATED heuristics, NOT monthly search volume.</i></p>
  <h2>Top 20 Keywords</h2><table><thead><tr><th>#</th><th>Keyword</th><th>Seed</th><th>Pos</th><th>Demand</th><th>Results</th><th>Score</th><th>Intent</th></tr></thead><tbody>
  ${d.mined.slice(0,20).map((m,i)=>{ const s=new Map(d.scored.keywords.map(k=>[k.keyword,k])).get(m.keyword); return `<tr><td>${i+1}</td><td>${m.keyword}</td><td>${m.seed}</td><td>${m.position}</td><td>${m.demand_signal}</td><td>${m.result_count??""}</td><td>${s? s.total:""}</td><td>${m.intent_bucket}</td></tr>`}).join("")}
  </tbody></table>
  <h2>Score Breakdown (Top 5)</h2>${d.scored.keywords.slice(0,5).map(k=> `<p><b>${k.keyword}</b> — ${k.total}/100 ${k.label}<br><span class="muted">${Object.entries(k.pillars).map(([n,p])=> `${n} ${p.score}/${p.max}: ${p.explain}`).join("<br>")}</span></p>`).join("")}
  <p class="muted" style="margin-top:32px">Generated by KDP Scout Pro • Data source & timestamp on every number • Never invents BSR/prices/reviews.</p>`;
  w.document.write(html); w.document.close();
  setTimeout(()=> w.print(), 500);
};
document.getElementById("btnCopyReport").onclick=async ()=>{
  if(!lastResearch){ toast("No data"); return; }
  const d=lastResearch;
  const text=`KDP Research — Overall ${d.scored.overall}/100 ${d.scored.overall_label}\nSeeds: ${d.input.seeds.join(", ")} • ${d.meta.marketplace_meta.code.toUpperCase()} • ${d.meta.total_mined} keywords\nTop: ${d.scored.keywords.slice(0,5).map(k=> `${k.keyword} (${k.total})`).join(", ")}\nSource: ${d.sources.keywords} • ${d.meta.updated_at}`;
  await navigator.clipboard.writeText(text);
  toast("Summary copied");
};

// re-render on results tab active when data exists
function renderResults(){ if(lastResearch) renderAll(lastResearch); }

// ── Image → PDF (client-side, no upload) ────────────────────────────────────
(() => {
  const dz = document.getElementById('dropzone');
  const inp = document.getElementById('inpImages');
  const grid = document.getElementById('thumbGrid');
  const empty = document.getElementById('emptyPick');
  const btnPick = document.getElementById('btnPickImages');
  const btnMake = document.getElementById('btnMakePDF');
  const btnClear = document.getElementById('btnClearImages');
  const btnDemo = document.getElementById('btnDemoImages');
  const selSize = document.getElementById('pdfSize');
  const selBg = document.getElementById('pdfBg');
  const inpName = document.getElementById('pdfName');
  const countPill = document.getElementById('countPill');
  const sizePill = document.getElementById('sizePill');
  const statusEl = document.getElementById('pdfStatus');
  const segOrient = document.getElementById('segOrient');
  const segFit = document.getElementById('segFit');
  const segMargin = document.getElementById('segMargin');
  if(!dz) return;

  let orientation='auto', fitMode='contain', margin=10;
  let images=[]; // {id, name, src, w, h}

  const sizeMap = {
    a4:{w:210,h:297}, letter:{w:215.9,h:279.4}, legal:{w:215.9,h:355.6}, a5:{w:148,h:210}, '6x9':{w:152.4,h:228.6}
  };

  function updatePills(){
    const s = selSize.value;
    countPill.textContent = `${images.length} image${images.length!==1?'s':''}`;
    sizePill.textContent = `${s.toUpperCase()} • ${orientation} • ${fitMode}`;
    empty.style.display = images.length? 'none':'block';
    btnMake.disabled = images.length===0;
    btnMake.style.opacity = images.length? '1':'.5';
  }
  function segmented(root, setter){
    root.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click',()=>{
        root.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        setter(b.dataset.v);
        updatePills();
      });
    });
  }
  segmented(segOrient, v=>orientation=v);
  segmented(segFit, v=>fitMode=v);
  segmented(segMargin, v=>{margin=parseInt(v,10); updatePills();});
  selSize.addEventListener('change', updatePills);
  updatePills();

  function addFiles(files){
    const list = Array.from(files).filter(f=>f.type.startsWith('image/'));
    if(!list.length){ toast('No images found'); return; }
    if(images.length + list.length > 50){ toast('Max 50 images'); list.splice(50-images.length); }
    let pending = list.length;
    list.forEach(f=>{
      const reader = new FileReader();
      reader.onload = e=>{
        const src = e.target.result;
        const img = new Image();
        img.onload = ()=>{
          images.push({id: Math.random().toString(36).slice(2), name:f.name, src, w:img.naturalWidth, h:img.naturalHeight, type:f.type});
          renderThumbs();
          pending--; if(pending===0) statusEl.textContent = `${images.length} images ready — click Download PDF`;
        };
        img.onerror = ()=>{ pending--; };
        img.src = src;
      };
      reader.readAsDataURL(f);
    });
  }

  function renderThumbs(){
    grid.innerHTML = images.map((im, idx)=>`
      <div class="thumb" draggable="true" data-id="${im.id}">
        <img src="${im.src}" alt="${im.name}" loading="lazy"/>
        <div class="t-actions">
          <button class="t-btn" data-act="up" title="Move up">↑</button>
          <button class="t-btn" data-act="down" title="Move down">↓</button>
          <button class="t-btn" data-act="del" title="Remove">✕</button>
        </div>
        <div class="t-meta">${idx+1}. ${im.name} • ${im.w}×${im.h}</div>
      </div>
    `).join('');
    // actions
    grid.querySelectorAll('.thumb').forEach(el=>{
      const id = el.dataset.id;
      el.querySelectorAll('.t-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const a = btn.dataset.act;
          const i = images.findIndex(x=>x.id===id);
          if(a==='del') images.splice(i,1);
          if(a==='up' && i>0) [images[i-1], images[i]] = [images[i], images[i-1]];
          if(a==='down' && i<images.length-1) [images[i+1], images[i]] = [images[i], images[i+1]];
          renderThumbs();
        });
      });
      // drag reorder
      el.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', id); el.style.opacity='.5'; });
      el.addEventListener('dragend', ()=> el.style.opacity='1');
      el.addEventListener('dragover', e=> e.preventDefault());
      el.addEventListener('drop', e=>{
        e.preventDefault();
        const dragId = e.dataTransfer.getData('text/plain');
        const from = images.findIndex(x=>x.id===dragId);
        const to = images.findIndex(x=>x.id===id);
        if(from>-1 && to>-1 && from!==to){ const [m]=images.splice(from,1); images.splice(to,0,m); renderThumbs(); }
      });
    });
    updatePills();
  }

  // events
  btnPick.addEventListener('click', ()=> inp.click());
  dz.addEventListener('click', (e)=>{ if(e.target===dz || e.target.closest('.dz-icon') || e.target.tagName==='H4' || e.target.classList.contains('tiny')) inp.click(); });
  dz.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); inp.click(); }});
  inp.addEventListener('change', ()=>{ if(inp.files.length) addFiles(inp.files); inp.value=''; });
  ['dragenter','dragover'].forEach(ev=> dz.addEventListener(ev, e=>{ e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev=> dz.addEventListener(ev, e=>{ e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e=>{ if(e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  // paste
  window.addEventListener('paste', e=>{
    const files = [...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));
    if(files.length){ const v=document.getElementById('view-image2pdf'); if(v?.classList.contains('active')) addFiles(files); }
  });
  btnClear.addEventListener('click', ()=>{ images=[]; renderThumbs(); statusEl.textContent='Cleared.'; });
  btnDemo.addEventListener('click', async ()=>{
    try{
      const c=document.createElement('canvas'); c.width=1200; c.height=800;
      const g=c.getContext('2d');
      const grad=g.createLinearGradient(0,0,1200,800); grad.addColorStop(0,'#0ea5e9'); grad.addColorStop(1,'#8b5cf6');
      g.fillStyle=grad; g.fillRect(0,0,1200,800);
      g.fillStyle='#fff'; g.font='800 64px Inter, system-ui'; g.fillText('KDP SCOUT PRO', 80, 300);
      g.font='400 28px Inter, system-ui'; g.fillText('Demo image → PDF (upload your own to replace)', 80, 360);
      g.fillStyle='rgba(255,255,255,.9)'; g.fillRect(80,420,360,8);
      const src=c.toDataURL('image/png');
      images.push({id:Math.random().toString(36).slice(2), name:'demo-cover.png', src, w:1200, h:800, type:'image/png'});
      renderThumbs(); statusEl.textContent='Demo image added — add more or Generate PDF';
    }catch(e){ toast('Demo failed: '+e.message); }
  });

  btnMake.addEventListener('click', async ()=>{
    if(!images.length){ toast('Add at least one image'); return; }
    if(!window.jspdf || !window.jspdf.jsPDF){ toast('PDF engine not loaded — refresh (CDN)'); return; }
    const { jsPDF } = window.jspdf;
    statusEl.textContent = 'Building PDF…';
    btnMake.disabled=true; btnMake.textContent='⏳ Building…';
    try{
      let format = selSize.value;
      let pdf;
      const bg = selBg.value;
      const fileName = (inpName.value.trim()||'images.pdf').replace(/[^a-zA-Z0-9._-]/g,'_') || 'images.pdf';
      const first = images[0];

      function pageSizeFor(img){
        if(format==='auto') return [img.w * 0.264583, img.h * 0.264583].map(v=> Math.min(500, Math.max(50, v))); // px→mm
        const s = sizeMap[format];
        return [s.w, s.h];
      }
      function orientFor(w,h, pw, ph){
        if(orientation==='portrait') return 'portrait';
        if(orientation==='landscape') return 'landscape';
        // auto: match image orientation
        return (w>h) ? 'landscape':'portrait';
      }

      // init with first page size
      let [pw,ph] = pageSizeFor(first);
      let orient = orientFor(first.w, first.h, pw, ph);
      if(orient==='landscape' && pw<ph) [pw,ph]=[ph,pw];
      if(orient==='portrait' && ph<pw) [pw,ph]=[ph,pw];

      pdf = new jsPDF({orientation: orient, unit:'mm', format:[pw,ph], compress:true});

      for(let idx=0; idx<images.length; idx++){
        const im = images[idx];
        let [w,h] = (format==='auto') ? pageSizeFor(im) : [sizeMap[format].w, sizeMap[format].h];
        let o = orientFor(im.w, im.h, w, h);
        let needAddPage = idx>0;
        if(format==='auto'){
          // dynamic page size per image — need new format each page
          let [nw,nh] = pageSizeFor(im);
          let no = o;
          if(no==='landscape' && nw<nh) [nw,nh]=[nh,nw];
          if(no==='portrait' && nh<nw) [nw,nh]=[nh,nw];
          if(idx===0){ w=nw; h=nh; }
          else {
            if(needAddPage) pdf.addPage([nw,nh], no);
            w=nw; h=nh; o=no;
            // bg fill for this page
            if(bg!=='white'){ pdf.setFillColor(bg==='black'?0:255); pdf.rect(0,0,nw,nh,'F'); }
            // compute placement for this dynamic page
            const m = margin;
            let pw2 = nw - m*2, ph2 = nh - m*2;
            let iw = im.w, ih = im.h;
            let scale = (fitMode==='contain') ? Math.min(pw2/ (iw*0.264583), ph2/(ih*0.264583)) : Math.max(pw2/(iw*0.264583), ph2/(ih*0.264583));
            // use px→mm factor 0.264583
            let rw = iw * 0.264583 * scale, rh = ih * 0.264583 * scale;
            let x = (nw - rw)/2, y = (nh - rh)/2;
            // add image — detect type
            let fmt = im.type.includes('png') ? 'PNG' : 'JPEG';
            try{ pdf.addImage(im.src, fmt, x, y, rw, rh, undefined, 'FAST'); }catch{ pdf.addImage(im.src, 'JPEG', x, y, rw, rh, undefined, 'FAST'); }
            continue;
          }
        }
        if(needAddPage) pdf.addPage([w,h], o);
        if(bg!=='white'){ pdf.setFillColor(bg==='black'?0:255); pdf.rect(0,0,w,h,'F'); }
        const m = margin;
        let availW = w - m*2, availH = h - m*2;
        let iw = im.w * 0.264583, ih = im.h * 0.264583;
        let scale = (fitMode==='contain') ? Math.min(availW/iw, availH/ih) : Math.max(availW/iw, availH/ih);
        let rw = iw * scale, rh = ih * scale;
        let x = (w - rw)/2, y = (h - rh)/2;
        let fmt = im.type.includes('png') ? 'PNG' : 'JPEG';
        try{ pdf.addImage(im.src, fmt, x, y, rw, rh, undefined, 'FAST'); }catch{ pdf.addImage(im.src, 'JPEG', x, y, rw, rh, undefined, 'FAST'); }
      }

      pdf.save(fileName.endsWith('.pdf')? fileName : fileName+'.pdf');
      statusEl.textContent = `✅ PDF downloaded: ${fileName} (${images.length} pages, ${format.toUpperCase()})`;
      toast('PDF downloaded ✓');
    }catch(err){
      console.error(err);
      statusEl.textContent = 'Failed: '+err.message;
      toast('PDF failed: '+err.message, 4000);
    }finally{
      btnMake.disabled=false; btnMake.textContent='⬇ Download PDF';
    }
  });
})();
