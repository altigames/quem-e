/* QUEM É?! v8 — AltiGames, flat vector art. Frontend estatico; autoridade de partida no Supabase RPC. */
(() => {
  'use strict';
  const cfg = window.QE_CONFIG || {};
  const el = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const client = window.supabase?.createClient?.(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:false }
  });
  const SESSION_KEY = 'qe-session-v3'; // Preservar sessao dos jogadores da v3.
  const colors = ['#87C7B9','#EDA6A0','#EEC37D','#A5A9D9','#91B8D6','#DAAECA'];
  const state = { room:null, token:null, code:null, categories:[], items:[],
    view:'home', homeMode:'choices', name:'', entryCode:'', selectedCategory:'', count:20,
    customTitle:'', customItems:[], modal:null, guessId:null, guessFilter:'', showEliminated:false,
    boardMarks:new Set(), timeOffset:0, busy:false, lastSignature:'',
    lastEventKey:'', adminSession:null, adminCat:null, adminEdit:null,
    adminNew:{ name:'',image_url:'' }, channel:null, poll:null, clock:null, leaving:false };

  const esc = x => String(x??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeColor = value => /^#[0-9a-fA-F]{6}$/.test(value||'') ? value : '#FFE600';
  const safeImg = value => /^(https:\/\/[^\s"'<>]+|data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+)$/.test(value||'') ? value : '';
  const imgHtml = (url, alt='') => safeImg(url) ? `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">` : '';
  const me = () => state.room?.players?.find(p=>p.is_me);
  const isHost = () => !!me()?.is_host;
  const isMyTurn = () => state.room?.status==='playing' && state.room.turn_player_id===state.room.me && !me()?.rank;
  // Marcar/eliminar e desmarcar sao acoes locais, mas permitidas somente durante o turno.
  // Respeitar tambem o fim real do cronometro antes do proximo sync do Supabase.
  const canEditBoard = () => isMyTurn() && (!state.room.turn_ends_at || (Date.now() + state.timeOffset) < Date.parse(state.room.turn_ends_at));
  const rankLabel = n => n===1?'1º':`${n}º`;
  const timerLabel = n => n===null?'∞':`${n}s`;
  const iconButton=(action,icon,label,extra='')=>`<button class="icon-action" data-action="${action}" title="${esc(label)}" aria-label="${esc(label)}" ${extra}>${icon}</button>`;
  const svgIcon = (name) => {
    const paths = {
      copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      share:'<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
      qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M15 14h2v3h-3v4h4m3-6v3h-2v3h2"/>',
      back:'<path d="m15 18-6-6 6-6"/><path d="M9 12h12"/>',
      enter:'<path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="m15 7 5 5-5 5M20 12H9"/>',
      plus:'<path d="M12 5v14M5 12h14"/>'
    };
    return `<svg class="ui-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.plus}</svg>`;
  };
  // Icones vetoriais preenchidos e sem contornos.
  const flatIcon = (name) => {
    const icons = {
      pass:'<path d="M8 13h19L18 4l5-4 19 19-19 19-5-5 9-9H8Z" fill="currentColor"/><path d="M34 34h12v7H34Z" fill="currentColor"/>',
      guess:'<path d="M25 3C11 3 2 12 2 24s9 21 22 21c4 0 8-1 11-3l10 5-3-13c3-3 5-7 5-12C47 11 37 3 25 3Zm-1 34a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm5-14c-3 2-4 3-4 5h-7c0-5 2-7 6-10 2-1 3-2 3-4 0-2-1-3-3-3-3 0-4 2-4 4h-7c0-6 5-11 12-11 7 0 12 4 12 10 0 5-3 7-8 9Z" fill="currentColor"/>',
      clock:'<circle cx="24" cy="25" r="19" fill="#F5BB72"/><path d="M24 13v14l10 6" fill="none" stroke="#6B6C82" stroke-width="5" stroke-linecap="round"/><path d="M7 8 2 16l8 4 6-8Zm34 0 6 8-8 4-6-8Z" fill="#E7797B"/>',
      trophy:'<path d="M10 4h29v17c0 13-6 22-15 22S10 34 10 21Z" fill="#EAB15D"/><path d="M10 10H2v8c0 11 7 16 12 16v-8c-3 0-5-3-5-8h1Zm29 0h8v8c0 11-7 16-12 16v-8c3 0 5-3 5-8h-1Z" fill="#F4C97F"/><path d="M19 39h10v5H19Zm-6 6h22v6H13Z" fill="#668F9F"/><path d="m24 12 4 7 8 1-6 6 2 8-8-4-8 4 2-8-6-6 8-1Z" fill="#FFF5DA"/>'
    };
    return `<svg class="flat-svg-icon" viewBox="0 0 50 50" width="32" height="32" aria-hidden="true">${icons[name]||icons.guess}</svg>`;
  };
  const categoryArt = (name) => {
    const n=String(name||'').toLocaleLowerCase('pt-BR'); let shapes='';
    if(/celebr|famos|pessoa|ator/.test(n)) shapes='<circle cx="49" cy="34" r="21" fill="#F2C79D"/><path d="M23 76c3-20 18-30 29-30s27 10 31 30Z" fill="#E57988"/><path d="M27 32C24 9 41 5 52 9c18-4 23 10 20 26-9-13-27-10-45-3Z" fill="#465C6F"/>';
    else if(/cine|filme|movie/.test(n)) shapes='<rect x="19" y="26" width="64" height="48" rx="9" fill="#5D90B2"/><path d="M19 19h64v20H19Z" fill="#F6D48D"/><path d="M30 19h13L32 39H19Zm26 0h13L58 39H45Zm26 0h1v20H70Z" fill="#E89A83"/><path d="m46 44 19 10-19 11Z" fill="#FDF5E6"/>';
    else if(/mús|mus|cant|som/.test(n)) shapes='<path d="M56 18v43c0 9-7 16-18 16-8 0-14-4-14-10 0-8 8-13 18-12V28Z" fill="#527C9F"/><path d="M42 28 79 18v17L42 45Z" fill="#EAA0AA"/>';
    else if(/esport|futeb|bola/.test(n)) shapes='<circle cx="50" cy="49" r="32" fill="#F3CC8C"/><path d="m50 29 13 10-5 16H42l-6-16Z" fill="#6688B4"/><path d="m50 17 1 12M79 48l-16-9M66 75l-8-20M34 75l8-20M21 48l15-9" stroke="#D58E65" stroke-width="6" stroke-linecap="round"/>';
    else if(/lugar|país|cidade|geograf/.test(n)) shapes='<circle cx="74" cy="25" r="15" fill="#F3C77E"/><path d="M10 78 42 27 63 56 76 38 94 78Z" fill="#588C83"/><path d="m28 49 14-22 10 14-9-4-7 12Z" fill="#F7F3DF"/><path d="M8 77h86v9H8Z" fill="#A9D2B2"/>';
    else if(/anim|bicho|pet/.test(n)) shapes='<ellipse cx="52" cy="61" rx="25" ry="19" fill="#E9A680"/><circle cx="28" cy="34" r="10" fill="#E9A680"/><circle cx="47" cy="23" r="10" fill="#E9A680"/><circle cx="66" cy="27" r="10" fill="#E9A680"/><circle cx="81" cy="44" r="10" fill="#E9A680"/>';
    else if(/comida|fruta|food/.test(n)) shapes='<path d="M29 44c-13-22 7-30 20-17 15-13 34-6 21 17 5 25-6 42-20 41-16 1-28-16-21-41Z" fill="#E98579"/><path d="M48 26c4-14 14-16 22-12-5 10-12 14-22 12Z" fill="#679A7D"/>';
    else shapes='<circle cx="46" cy="46" r="29" fill="#EAA0AA"/><path d="m50 18 8 18 20 4-15 13 4 21-17-10-17 10 4-21-15-13 20-4Z" fill="#FFF2D2"/>';
    return `<svg class="category-art" viewBox="0 0 100 100" aria-hidden="true">${shapes}</svg>`;
  };
  const initial = name => [...String(name||'?').trim()][0]?.toLocaleUpperCase('pt-BR') || '?';
  const categoryFor = id => state.categories.find(c=>c.id===id);
  const itemsFor = id => state.items.filter(i=>i.category_id===id);
  const currentLink = () => { const url = new URL(cfg.siteUrl||location.href); url.search=''; url.hash=''; url.searchParams.set('sala',state.room?.code||state.entryCode||''); return url.toString(); };
  function showToast(text, ok=false) { toastEl.textContent=String(text); toastEl.className='toast show'+(ok?' ok':''); clearTimeout(showToast.t); showToast.t=setTimeout(()=>toastEl.className='toast',3600); }
  function friendlyError(error) { let s=error?.message||String(error||'Erro inesperado'); if (/function public\.qe_|schema cache|Could not find the function/i.test(s)) return 'Funções Quem É?! indisponíveis. Execute a migração v3 e atualize a página.'; if (/Failed to fetch|fetch failed|NetworkError/i.test(s)) return 'Sem conexão com o Supabase. Confira sua internet.'; return s.replace(/^.*?ERROR: /,'').slice(0,230); }
  async function safeCall(callback) { if (state.busy) return; state.busy=true; try { await callback(); } catch(e) {console.error(e);showToast(friendlyError(e));} finally {state.busy=false;} }
  async function rpc(fn, params={}) {if(!client) throw Error('Biblioteca do Supabase não carregou. Verifique a conexão.'); const {data,error}=await client.rpc(fn,params);if(error)throw error;return data;}
  async function loadCatalog() {
    if(!client) return;
    const {data:c,error:ce}=await client.from('qe_categories').select('*').order('sort_order').order('name');
    if(ce) throw ce;
    let list=[],start=0;
    while (start<20000) {
      const {data:rows,error}=await client.from('qe_items').select('id,category_id,name,image_url').order('name').range(start,start+999);
      if(error)throw error;
      list=list.concat(rows||[]);
      if((rows||[]).length<1000)break;
      start+=1000;
    }
    state.categories=c||[];state.items=list;
    if(!categoryFor(state.selectedCategory)) {state.selectedCategory=state.categories.find(c=>c.active&&itemsFor(c.id).length>=16)?.id||'';}
    if(!state.adminCat)state.adminCat=state.categories[0]?.id||null;
  }
  function persistSession() { if(state.token&&state.code)sessionStorage.setItem(SESSION_KEY,JSON.stringify({token:state.token,code:state.code})); }
  function clearSession() { state.modal=null;document.getElementById('overlay')?.remove();sessionStorage.removeItem(SESSION_KEY); state.token=null;state.code=null;state.room=null;state.lastSignature='';state.lastEventKey='';state.boardMarks=new Set();endLive(); }
  function setSession(data) {state.token=data.token;state.code=data.code;persistSession();state.room=null;state.lastSignature='';state.view='room';state.modal=null;state.boardMarks=new Set();}
  function boardKey() {return `qe-board-${state.room?.code}-${state.room?.me}`;}
  function readMarks(){try{state.boardMarks=new Set(JSON.parse(sessionStorage.getItem(boardKey())||'[]'));}catch{state.boardMarks=new Set();}}
  function saveMarks(){sessionStorage.setItem(boardKey(),JSON.stringify([...state.boardMarks]));}
  async function getState(force=false){
    if(!state.token || state.leaving)return;
    try{
      let next=await rpc('qe_state',{p_token:state.token,p_full:!state.room});
      if(next.items===null){
        if(next.status==='playing'&&(!state.room?.items?.length||state.room.items.length!==next.target_count||state.room.round_id!==next.round_id)){
          next=await rpc('qe_state',{p_token:state.token,p_full:true});
        }else{next.items=state.room?.items||[];}
      }
      if (state.leaving || !state.token) return;
      state.timeOffset=Date.parse(next.server_time)-Date.now();
      const sig=JSON.stringify({...next,server_time:null});
      const changed=(sig!==state.lastSignature || force);
      const was=state.room;state.room=next;
      if(!was&&next.theme_id){state.selectedCategory=next.theme_id;state.count=next.target_count||20;}
      if(!was||was.code!==next.code||was.me!==next.me)readMarks();
      if(was && was.round_id!==next.round_id){state.boardMarks=new Set();saveMarks();state.modal=null;}
      state.lastSignature=sig;
      if(changed){
        if(state.view!=='room')state.view='room';
        if(was&&was.turn_number!==next.turn_number&&['guess','guess-check'].includes(state.modal?.type))state.modal=null;
        if(was?.status!=='finished'&&next.status==='finished'&&state.modal?.type!=='guess-result')state.modal=null;
        render();
        if(was&&next.last_event?.type==='wrong'&&next.turn_number!==was.turn_number)showToast(`${next.last_event.player} errou o palpite! Próxima vez.`,false);
      }
      updateClock();
    } catch(e){
      if(state.leaving || !state.token)return;
      if(/sessão não está|sessão inválida|sala expir|sala não|session|room expired/i.test((e.message||'').toLowerCase())){
        clearSession();state.view='home';render();showToast('Sua sessão terminou. Entre em uma nova sala.');
      }else if(!getState.lastErr || Date.now()-getState.lastErr>12000){getState.lastErr=Date.now();showToast(friendlyError(e));}
    }
  }
  function endLive(){clearInterval(state.poll);clearInterval(state.clock);state.poll=null;state.clock=null;if(state.channel){client?.removeChannel(state.channel);state.channel=null;}}
  function startLive(){
    endLive();if(!state.token)return;
    state.poll=setInterval(()=>{if(!document.hidden)void getState();},1700);
    state.clock=setInterval(()=>{updateClock();updateResultProgress();},100);
    if(client&&state.code){state.channel=client.channel(`quem-e:${state.code}`,{config:{broadcast:{self:false}}}).on('broadcast',{event:'changed'},()=>void getState()).subscribe();}
  }
  function pingPeers(){try{state.channel?.send({type:'broadcast',event:'changed',payload:{at:Date.now()}});}catch{}}
  async function act(action,data={}){
    await rpc('qe_action',{p_token:state.token,p_action:action,p_data:data});
    pingPeers();await getState(true);
  }
  async function create(){
    if(!state.name.trim())return showToast('Digite seu nome primeiro.');
    await safeCall(async()=>{const data=await rpc('qe_create',{p_name:state.name.trim()});setSession(data);await loadCatalog();await getState(true);startLive();});
  }
  async function join(){
    if(!state.name.trim())return showToast('Digite seu nome primeiro.');
    const code=state.entryCode.trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))return showToast('Digite um código de 6 caracteres.');
    await safeCall(async()=>{const data=await rpc('qe_join',{p_code:code,p_name:state.name.trim()});setSession(data);await getState(true);startLive();});
  }
  async function leave(){
    if(state.leaving || state.busy)return;
    state.busy=true;
    state.leaving=true;
    state.modal=null;
    document.getElementById('overlay')?.remove();
    endLive();
    const leavingToken=state.token;
    try {
      // Nao chamar act()/getState(): apos 'leave', o token nao existe mais.
      await rpc('qe_action',{p_token:leavingToken,p_action:'leave',p_data:{}});
      pingPeers();
      clearSession();
      state.view='home';
      state.homeMode='choices';
      state.entryCode='';
      state.leaving=false;
      render();
    } catch(e) {
      state.leaving=false;
      startLive();
      render();
      console.error('Nao foi possivel sair:',e);
      showToast(friendlyError(e));
    } finally {
      state.busy=false;
    }
  }
  async function doAction(action,data={}){await safeCall(async()=>{await act(action,data);});}
  function header(tag='',room=false){return `<div class="site-head"><div class="logo logo-small" aria-label="QUEM É">QUEM <span>É?!</span></div><div class="header-right">${tag?`<span class="head-tag">${esc(tag)}</span>`:''}${room?iconButton('leave-open',svgIcon('back'),'Sair da sala'):state.view==='admin'?iconButton('admin-back',svgIcon('back'),'Voltar ao jogo'):''}</div></div>`;}
  function renderHome(){
    const step=state.homeMode;
    const choose=step==='choices';
    el.innerHTML=`<div class="site-shell"><main class="app-scroll"><div class="home-area"><div class="home-grid flat-home">
      <div class="home-hero-flat"><div class="hero-orbit orbit-a"></div><div class="hero-orbit orbit-b"></div><img class="hero-illustration" src="assets/hero.svg" alt="Três pessoas ilustradas com formas e cores suaves"/><div class="flat-wordmark"><span>Quem</span><em>É?!</em></div><span class="hero-spark spark-a" aria-hidden="true">✳</span><span class="hero-spark spark-b" aria-hidden="true">✦</span></div>
      <section class="flat-home-form">${choose?`<p class="home-strapline">Quem você será hoje?</p><button class="btn btn-primary" data-action="choose-create">${svgIcon('plus')} Criar sala</button><button class="btn btn-cyan" data-action="choose-join">${svgIcon('enter')} Entrar na sala</button><p class="home-support">De 2 a 5 pessoas · Descubra sua identidade</p>`:
       `<button class="entry-back" data-action="go-back">${svgIcon('back')} Voltar</button><h2 class="panel-title">${step==='create'?'Criar sala':'Entrar na sala'}</h2>${step==='join'?`<div class="field"><label for="join-code">Código da sala</label><input id="join-code" class="text-input" placeholder="AB3DE7" maxlength="6" value="${esc(state.entryCode)}" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.18em"></div>`:''}<div class="field"><label for="player-name">Seu nome</label><input id="player-name" maxlength="22" class="text-input" placeholder="Como quer aparecer?" value="${esc(state.name)}" autocomplete="nickname"></div><button class="btn ${step==='create'?'btn-primary':'btn-cyan'}" data-action="${step==='create'?'create':'join'}">${step==='create'?'Criar partida':'Entrar na partida'} ${svgIcon('enter')}</button>`}</section>
    </div></div></main></div>`;
  }
  function roomPlayerRows(){return (state.room.players||[]).map((p,i)=>`<div class="player-row bubble-player bubble-variant-${i%4}"><div class="player-no" style="--avatar-bg:${colors[i%colors.length]}">${esc(initial(p.name))}</div><span class="player-name" title="${esc(p.name)}">${esc(p.name)}${p.is_me?'<small> • você</small>':''}</span>${p.is_host?'<span class="mini-tag" title="Host">★</span>':''}${isHost()&&!p.is_me?iconButton('kick-open','×',`Expulsar ${p.name}`,`data-id="${p.id}"`):''}</div>`).join('');}
  function themeCards(){const all=state.categories.filter(c=>c.active);return all.map((c,i)=>{const n=itemsFor(c.id).length;return `<button class="theme-card theme-tone-${i%6} ${state.selectedCategory===c.id?'selected':''}" data-action="choose-theme" data-id="${c.id}" ${n<16?'disabled':''}><span class="theme-illustration">${categoryArt(c.name)}</span><span class="theme-meta"><span class="theme-name">${esc(c.name)}</span><span class="theme-qty">${n} itens</span></span>${state.selectedCategory===c.id?'<span class="theme-check">✓</span>':''}</button>`;}).join('')+`<button class="theme-card custom" data-action="custom-open"><span class="theme-illustration custom-art">✳</span><span class="theme-meta"><span class="theme-name">Criar tema</span><span class="theme-qty">Seu universo</span></span></button>`;}
  function renderLobby(){const r=state.room;const host=isHost();const picked=categoryFor(state.selectedCategory);const max=picked?itemsFor(picked.id).length:16;state.count=Math.max(16,Math.min(max,state.count));
    const options=[15,30,45,60,90,120,null];const timeControls=options.map(n=>`<button class="time-opt ${r.turn_seconds===n?'selected':''}" data-action="set-time" data-seconds="${n===null?'infinite':n}" title="${n===null?'Sem limite':n+' segundos'}">${timerLabel(n)}</button>`).join('');
    el.innerHTML=`<div class="room-shell">${header(`SALA ${r.code}`,true)}<main class="lobby-scroll"><div class="lobby-wrap"><aside class="lobby-side">
      <div class="panel room-code-panel"><div class="room-code">${esc(r.code)}</div><div class="code-buttons">${iconButton('copy',svgIcon('copy'),'Copiar link')}${iconButton('share',svgIcon('share'),'Compartilhar')}${iconButton('qr-open',svgIcon('qr'),'QR Code')}</div></div>
      <div class="panel"><div class="section-inline"><h2 class="section-title">JOGADORES</h2><span class="sticker">${r.players.length}/5</span></div><div class="players-list">${roomPlayerRows()}</div></div>
      </aside><section class="panel"><div class="theme-header"><h2 class="section-title">${host?'TEMA':'TEMA DA RODADA'}</h2>${host?'<span class="mini-tag">★ HOST</span>':''}</div>
      ${host?`<div class="theme-list">${themeCards()}</div>
      ${picked?`<div class="choice-controls"><span class="tiny-label">ITENS</span><div class="count-stepper"><button data-action="count-minus" aria-label="Menos itens">−</button><input id="item-count" aria-label="Quantidade de itens" type="number" min="16" max="${max}" value="${state.count}"><button data-action="count-plus" aria-label="Mais itens">+</button></div><button class="btn btn-violet btn-sm" data-action="confirm-theme">✓ ESCOLHER</button></div>`:''}
      <div class="time-config"><span class="comic-time-heading">${flatIcon('clock')}<span>TEMPO POR VEZ</span></span><div class="time-options">${timeControls}</div></div>`:
      `<div class="round-comic-summary"><div class="summary-tile theme-summary"><span class="summary-label">TEMA</span><strong>${r.theme_name?esc(r.theme_name):'AGUARDANDO...'}</strong><span>${r.target_count||'—'} ITENS</span></div><div class="summary-tile time-summary">${flatIcon('clock')}<span class="summary-label">TEMPO</span><strong>${r.turn_seconds===null?'∞':r.turn_seconds+'s'}</strong></div></div>`}
      
      </section></div></main><footer class="lobby-bottom">${host?`<button class="btn btn-primary" data-action="start" ${!r.theme_name||r.players.length<2?'disabled':''}>▶ JOGAR</button>`:'<span class="sticker">⏳ AGUARDANDO</span>'}</footer></div>`;
  }
  function playerChips(){return state.room.players.map((p,i)=>`<div class="p-chip ${p.id===state.room.turn_player_id?'active':''} ${p.is_me?'me':''} ${p.rank?'ranked':''}" title="${esc(p.name)}"><span class="avatar" style="--a-color:${colors[i%colors.length]}">${esc(initial(p.name))}</span><div class="p-info"><div class="p-name">${esc(p.name)}${p.is_me?' •':''}${p.is_host?' ★':''}</div><div class="p-identity">${p.rank?`${rankLabel(p.rank)} · `:''}${p.is_me&&!p.rank?'?':esc(p.identity?.name||'?')}</div></div></div>`).join('');}
  function boardCards(){const editable=canEditBoard();return state.room.items.map((item,i)=>{const hasImage=!!safeImg(item.image_url);const name=esc(item.name);const size=item.name.length>48?'ultra':item.name.length>31?'long':item.name.length>18?'medium':'short';const cardTitle=editable?`${name} — toque para ${state.boardMarks.has(item.id)?'restaurar':'eliminar'}`:`${name} — aguarde sua vez`;return `<button type="button" aria-pressed="${state.boardMarks.has(item.id)}" aria-disabled="${!editable}" class="item-card flat-tone-${i%6} ${hasImage?'with-image':'text-only'} ${state.boardMarks.has(item.id)?'eliminated':''}" data-action="mark" data-id="${item.id}" title="${cardTitle}" ${editable?'':'disabled'}><span class="item-ink"><span class="card-art">${hasImage?imgHtml(item.image_url,item.name):`<span class="card-fullname ${size}">${name}</span>`}</span>${hasImage?`<span class="card-title">${name}</span>`:''}</span></button>`;}).join('');}
  function syncBoardLock(){
    const board=document.getElementById('board-wrap');
    if(!board)return;
    const editable=canEditBoard();
    if(board.dataset.editable===String(editable))return;
    board.dataset.editable=String(editable);
    board.classList.toggle('board-locked',!editable);
    const status=document.getElementById('board-turn-status');
    if(status){status.textContent=editable?'SUA VEZ':me()?.rank?'VOCÊ ACERTOU':'AGUARDE SUA VEZ';status.classList.toggle('editable',editable);}
    board.querySelectorAll('.item-card').forEach(btn=>{
      btn.disabled=!editable;
      btn.setAttribute('aria-disabled',String(!editable));
      const item=state.room?.items?.find(i=>i.id===btn.dataset.id);
      if(item)btn.title=editable?`${item.name} — toque para ${state.boardMarks.has(item.id)?'restaurar':'eliminar'}`:`${item.name} — aguarde sua vez`;
    });
  }
  function renderGame(){const r=state.room;const current=r.players.find(p=>p.id===r.turn_player_id);const ranked=!!me()?.rank;
    el.innerHTML=`<div class="game-screen">${header(r.theme_name,true)}<section class="game-top"><div class="turn-banner"><div class="turn-icon">${ranked?'✦':'?'}</div><div class="turn-copy"><div class="turn-heading">Vez de ${esc(current?.name||'...')}</div>${ranked?`<div class="turn-hint">Você: ${rankLabel(me().rank)} lugar</div>`:''}</div></div><div class="clock-box"><span id="clock-number" class="clock-number">${r.turn_seconds===null?'∞':'--'}</span>${r.turn_seconds===null?'':'<span class="clock-unit">s</span>'}</div></section><section class="game-players">${playerChips()}</section>
      <div class="board-wrap" id="board-wrap"><div class="board-heading"><h2>TABULEIRO</h2><span class="board-turn-status" id="board-turn-status" aria-live="polite"></span><span class="board-stats" id="board-stats">${state.boardMarks.size}/${r.items.length}</span></div><div class="board-scroll" id="board-scroll"><div class="board-grid" id="board-grid">${boardCards()}</div></div></div>
      <footer class="game-actions"><button class="btn btn-yellow" data-action="next" ${!isMyTurn()&&!isHost()?'disabled':''}>${flatIcon('pass')}<span>PASSAR</span></button><button class="btn btn-primary" data-action="guess-open" ${!isMyTurn()?'disabled':''}>${flatIcon('guess')}<span>PALPITE</span></button></footer></div>`;updateClock();}
  function renderFinished(){const r=state.room;const ranks=[...r.players].sort((a,b)=>(a.rank??99)-(b.rank??99)||a.seat-b.seat);const ready=r.players.filter(p=>p.ready).length;
    el.innerHTML=`<div class="room-shell end-cover">${header(`SALA ${r.code}`,true)}<main class="end-screen"><div class="finish-illustration"><img src="assets/celebration.svg" alt="Troféu colorido"/><h1 class="end-banner">Ranking<span>!</span></h1></div><div class="end-names">${ranks.map((p,i)=>`<div class="result-row result-shape-${i%4} ${p.rank===1?'winner':''}"><strong>${p.rank?rankLabel(p.rank):'—'}</strong><span class="result-person">${esc(p.name)}${p.is_me?' · você':''}</span><small>${esc(p.identity?.name||'?')}</small></div>`).join('')}</div><div class="end-actions"><button class="btn btn-primary" data-action="ready-again" ${me()?.ready?'disabled':''}>${me()?.ready?'✓ Pronto':'↻ Jogar de novo'} <span class="ready-count">${ready}/${r.players.length}</span></button>${isHost()?`<button class="btn btn-cyan" data-action="new-game">✦ Novo jogo</button><button class="btn btn-ghost" data-action="close-room-open">Encerrar sala</button>`:'<button class="btn btn-ghost" data-action="leave-open">Sair</button>'}</div></main></div>`;}
  function renderRoom(){if(!state.room){renderHome();return;}if(state.room.status==='lobby')renderLobby();else if(state.room.status==='playing')renderGame();else renderFinished();}
  function renderAdmin(){
    const categories=state.categories;
    const selected=categoryFor(state.adminCat);
    const filtered=itemsFor(state.adminCat);
    el.innerHTML=`<div class="admin-shell">${header('ADMIN')}<main class="admin-scroll"><div class="admin-wrap"><button class="btn btn-sm btn-yellow" data-action="admin-back" style="margin-bottom:17px">↩ VOLTAR AO JOGO</button>
      ${!state.adminSession?`<div class="panel" style="max-width:440px;margin:auto"><h2 class="section-title">ACESSO ADMIN</h2><p class="subcopy">Use a conta administrativa já cadastrada no Supabase Auth da AltiGames.</p><div class="field"><label>E-MAIL</label><input id="admin-email" type="email" class="text-input" autocomplete="username"></div><div class="field"><label>SENHA</label><input id="admin-password" type="password" class="text-input" autocomplete="current-password"></div><button class="btn btn-primary" data-action="admin-login">🔐 ENTRAR</button></div>`:
      `<div class="theme-header"><div><span class="tiny-label">CATÁLOGO PERMANENTE • SUPABASE + CLOUDFLARE R2</span><h2 class="section-title">GERENCIAR TEMAS E ITENS</h2></div><button class="btn btn-sm btn-ghost" data-action="admin-logout">SAIR DA CONTA</button></div><div class="admin-grid"><aside class="panel"><h3 class="section-title">TEMAS</h3><div>${categories.map(c=>`<div class="admin-cat ${state.adminCat===c.id?'active':''}" data-action="admin-select-cat" data-id="${c.id}"><span>${esc(c.emoji)}</span><strong>${esc(c.name)}</strong><span class="mini-tag">${itemsFor(c.id).length}</span></div>`).join('')}</div><button class="btn btn-cyan" style="width:100%;margin-top:12px" data-action="admin-new-cat">+ NOVO TEMA</button></aside><section class="panel"><h3 class="section-title">${selected?esc(selected.emoji)+' '+esc(selected.name):'ESCOLHA UM TEMA'}</h3>${selected?`<div class="code-buttons"><button class="btn btn-sm btn-yellow" data-action="admin-edit-cat">✎ EDITAR TEMA</button><button class="btn btn-sm btn-ghost" data-action="admin-delete-cat">⌫ EXCLUIR TEMA</button></div><p class="subcopy" style="margin-top:12px">${filtered.length} itens cadastrados • mínimo de 16 para jogar</p><div class="field"><label>CADASTRAR NOVO ITEM</label><input class="text-input" id="admin-new-name" placeholder="Nome do personagem, filme, lugar..."></div><div class="field"><label>IMAGEM (OPCIONAL) • R2</label><div style="display:flex;gap:7px;align-items:center"><input type="url" class="text-input" id="admin-new-image" placeholder="https://audio.altigames.com.br/..." style="flex:1;min-width:0"><label class="btn btn-sm btn-cyan" style="position:relative;flex:0 0 auto">⬆ UPLOAD<input type="file" id="admin-image-file" accept="image/png,image/jpeg,image/webp" style="position:absolute;inset:0;opacity:0;width:100%;cursor:pointer"></label></div></div><button class="btn btn-primary" data-action="admin-add-item">+ ADICIONAR ITEM</button><div class="admin-item-list">${filtered.map(item=>`<div class="admin-item">${imgHtml(item.image_url,item.name)||'<span class="guess-thumb">💥</span>'}<span class="admin-item-name">${esc(item.name)}</span><div class="admin-item-actions"><button class="btn btn-sm btn-yellow" data-action="admin-edit-item" data-id="${item.id}">✎</button><button class="btn btn-sm btn-ghost" data-action="admin-delete-item" data-id="${item.id}">✕</button></div></div>`).join('')}</div>`:'<p>Crie um tema para começar.</p>'}</section></div>`}
    </div></main></div>`;
  }
  function render(){
    const preserve={};for(const id of ['lobby-scroll','board-scroll','admin-scroll','theme-list']){const node=document.querySelector('.'+id);if(node)preserve[id]=node.scrollTop;}
    if(state.view==='admin')renderAdmin();else if(state.view==='room')renderRoom();else renderHome();
    for(const [id,top] of Object.entries(preserve)){const node=document.querySelector('.'+id);if(node)node.scrollTop=top;}
    if(state.modal)renderModal();
  }
  function updateResultProgress(){
    if(state.modal?.type!=='guess-result')return;
    const ms=Math.max(0,(state.modal.endsAt||0)-Date.now());
    const bar=document.getElementById('guess-result-fill');
    if(bar)bar.style.width=`${(ms/5000)*100}%`;
    if(ms===0){state.modal=null;document.getElementById('overlay')?.remove();}
  }
  function modalMarkup(title,body,foot='',wide=false,closable=true){return `<div class="overlay" id="overlay"><section class="modal flat-dialog ${wide?'modal-wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2 class="bubble-title">${esc(title)}</h2><div class="modal-body">${body}</div>${foot?`<footer class="modal-foot">${foot}</footer>`:''}</section></div>`;}
  function initialCustom(){if(!state.customItems.length)state.customItems=Array.from({length:16},()=>({name:'',image_url:''}));}
  function renderModal(){document.getElementById('overlay')?.remove();if(!state.modal)return;const m=state.modal;let html='';
    if(m.type==='copy-link'){html=modalMarkup('COPIAR LINK',`<input class="text-input" readonly value="${esc(m.text)}" onclick="this.select()" aria-label="Link da sala">`,`<button class="btn btn-primary" data-action="modal-close">OK</button>`);}
    if(m.type==='qr'){html=modalMarkup('ESCANEIE E ENTRE!',`<p class="subcopy">Sala ${esc(state.room.code)}</p><div id="qr-target" class="qr-target"></div><p class="subcopy" style="overflow-wrap:anywhere;text-align:center">${esc(currentLink())}</p>`,`<button class="btn btn-yellow" data-action="copy">COPIAR</button><button class="btn btn-ghost" data-action="modal-close">VOLTAR</button>`);}
    if(m.type==='leave'){html=modalMarkup('SAIR DA PARTIDA?',`<p>Ao sair, sua vaga será liberada. ${isHost()?'Como host, você também encerrará a partida para todos.':'Você poderá entrar novamente enquanto a sala estiver aberta.'}</p>`,`<button class="btn btn-ghost" data-action="modal-close">CANCELAR</button><button class="btn btn-primary" data-action="leave">SIM, SAIR</button>`);}
    if(m.type==='close-room'){html=modalMarkup('ENCERRAR SALA?',`<p>Todos sairão da sala. Esta ação não pode ser desfeita.</p>`,`<button class="btn btn-ghost" data-action="modal-close">VOLTAR</button><button class="btn btn-primary" data-action="close-room">ENCERRAR</button>`);}
    if(m.type==='kick'){const p=state.room.players.find(p=>p.id===m.playerId);html=modalMarkup('EXPULSAR JOGADOR?',`<p>Remover <strong>${esc(p?.name)}</strong> desta sala?</p>`,`<button class="btn btn-ghost" data-action="modal-close">CANCELAR</button><button class="btn btn-primary" data-action="kick-confirm" data-id="${esc(m.playerId)}">EXPULSAR</button>`);}
    if(m.type==='guess'){html=modalMarkup('PALPITE!',`<p class="subcopy">Escolha uma opção.</p><input type="search" class="text-input" id="guess-search" placeholder="Buscar uma opção..." value="${esc(state.guessFilter)}"><label style="font-size:12px;display:flex;gap:7px;align-items:center;margin-top:10px;font-weight:700"><input type="checkbox" id="guess-show-elim" ${state.showEliminated?'checked':''}> Mostrar também itens eliminados</label><div class="guess-list" id="guess-list">${guessOptions()}</div>`,`<button class="btn btn-ghost" data-action="modal-close">CANCELAR</button><button class="btn btn-primary" data-action="guess-confirm" ${!state.guessId?'disabled':''}>CONFIRMAR!</button>`,true);}
    if(m.type==='guess-check'){const chosen=state.room?.items?.find(i=>i.id===state.guessId);html=modalMarkup('CONFIRMAR?',`<div class="guess-confirm-card">${imgHtml(chosen?.image_url,chosen?.name)}<strong>${esc(chosen?.name||'')}</strong></div>`,`<button class="btn btn-ghost" data-action="guess-back">VOLTAR</button><button class="btn btn-primary" data-action="guess-final">CONFIRMAR!</button>`);}
    if(m.type==='guess-result'){
      const successful=!!m.correct;
      html=modalMarkup(successful?'Acertou!':'Ainda não!',
        `<div class="guess-result-art ${successful?'yes':'no'}"><span class="result-symbol">${successful?'✦':'✳'}</span></div><div class="guess-result-label">${successful?`${rankLabel(m.rank)} lugar`:'Tente na próxima!'}</div>`,
        `<button class="btn ${successful?'btn-primary':'btn-cyan'}" data-action="modal-close">Voltar</button><div class="guess-result-track" aria-hidden="true"><div id="guess-result-fill"></div></div>`,false,false);
    }
    if(m.type==='admin-delete'){html=modalMarkup('EXCLUIR?',`<p>${esc(m.label)}</p>`,`<button class="btn btn-ghost" data-action="modal-close">CANCELAR</button><button class="btn btn-primary" data-action="admin-delete-confirm">EXCLUIR</button>`);}
    if(m.type==='custom'){initialCustom();html=modalMarkup('✨ CRIE SEU TEMA!',`<div class="notice">Somente para esta partida. Imagens são reduzidas no seu aparelho e ficam temporariamente na sala.</div><div class="field" style="margin-top:13px"><label>NOME DO SEU TEMA</label><input class="text-input" id="custom-title" placeholder="Ex: Personagens do nosso grupo" maxlength="65" value="${esc(state.customTitle)}"></div><div class="field"><label>ADICIONAR VÁRIOS ITENS DE UMA VEZ (UM POR LINHA)</label><textarea class="text-input" id="custom-bulk" placeholder="Mario\nLuigi\nPeach\nYoshi..."></textarea><button class="btn btn-sm btn-cyan" style="align-self:start" data-action="custom-bulk-add">+ ADICIONAR ESSAS LINHAS</button></div><p class="tiny-label">ITENS DO TEMA <span id="custom-count">${state.customItems.length}</span> • MÍNIMO 16</p><div class="custom-grid" id="custom-grid">${customItemsHtml()}</div><div class="custom-options"><button class="btn btn-sm btn-yellow" data-action="custom-add">+ ITEM</button><button class="btn btn-sm" data-action="custom-add-8">+ 8 ITENS</button></div>`,`<button class="btn btn-ghost" data-action="modal-close">CANCELAR</button><button class="btn btn-primary" data-action="custom-save">✓ USAR TEMA</button>`,true);}
    if(m.type==='admin-cat'){const c=state.categories.find(x=>x.id===m.id);html=modalMarkup(c?'EDITAR TEMA':'NOVO TEMA',`<div class="field"><label>NOME</label><input id="cat-name" class="text-input" maxlength="65" value="${esc(c?.name||'')}"></div><div class="field"><label>EMOJI</label><input id="cat-emoji" class="text-input" maxlength="6" value="${esc(c?.emoji||'💥')}"></div><div class="field"><label>COR DO CARD</label><input id="cat-color" type="color" value="${safeColor(c?.color)}" style="width:100%;height:48px;border:0;border-radius:16px"></div><label style="display:flex;gap:7px;align-items:center;font-weight:800"><input id="cat-active" type="checkbox" ${c?.active!==false?'checked':''}> Disponível para os jogadores</label>`,`<button class="btn btn-ghost" data-action="modal-close">CANCELAR</button><button class="btn btn-primary" data-action="admin-save-cat">SALVAR</button>`);}
    if(m.type==='admin-item'){const item=state.items.find(i=>i.id===m.id);html=modalMarkup('EDITAR ITEM',`<div class="field"><label>NOME</label><input class="text-input" id="edit-item-name" maxlength="90" value="${esc(item?.name||'')}"></div><div class="field"><label>URL DA IMAGEM (R2 OU HTTPS)</label><input class="text-input" id="edit-item-image" value="${esc(item?.image_url||'')}"></div><label class="btn btn-cyan" style="position:relative">⬆ ENVIAR NOVA IMAGEM<input type="file" id="admin-image-edit-file" accept="image/png,image/jpeg,image/webp" style="position:absolute;inset:0;opacity:0;width:100%;cursor:pointer"></label>`,`<button class="btn btn-ghost" data-action="modal-close">CANCELAR</button><button class="btn btn-primary" data-action="admin-save-item">SALVAR</button>`);}
    document.body.insertAdjacentHTML('beforeend',html);
    if(m.type==='guess-result')updateResultProgress();
    if(m.type==='qr'){const target=document.getElementById('qr-target');if(window.QRCode){new window.QRCode(target,{text:currentLink(),width:190,height:190,colorDark:'#161616',colorLight:'#ffffff'});}else{target.textContent='QR indisponível. Copie o link abaixo.';}}
  }
  function guessOptions(){const term=state.guessFilter.trim().toLocaleLowerCase('pt-BR');return (state.room?.items||[]).filter(i=>(state.showEliminated||!state.boardMarks.has(i.id))&&i.name.toLocaleLowerCase('pt-BR').includes(term)).map(i=>`<button class="guess-opt ${state.guessId===i.id?'selected':''}" data-action="guess-select" data-id="${i.id}"><span class="guess-thumb">${imgHtml(i.image_url,i.name)||'❔'}</span><span>${esc(i.name)}</span></button>`).join('')||'<p>Nenhum item encontrado. Experimente mostrar os eliminados.</p>';}
  function refreshGuess(){const opts=document.getElementById('guess-list');if(opts)opts.innerHTML=guessOptions();const btn=document.querySelector('[data-action="guess-confirm"]');if(btn)btn.disabled=!state.guessId;}
  function customItemsHtml(){return state.customItems.map((i,n)=>`<div class="custom-item"><span class="custom-num">${n+1}</span><input class="text-input custom-name" data-idx="${n}" maxlength="90" placeholder="Nome do item" value="${esc(i.name)}"><label class="img-picker" title="Adicionar imagem">${imgHtml(i.image_url,i.name)||'📷'}<input type="file" accept="image/jpeg,image/png,image/webp" class="custom-image" data-idx="${n}" aria-label="Imagem do item ${n+1}"></label><button class="del-item" data-action="custom-delete" data-idx="${n}" aria-label="Excluir item">×</button></div>`).join('');}
  function updateCustomGrid(){const grid=document.getElementById('custom-grid');if(grid)grid.innerHTML=customItemsHtml();const count=document.getElementById('custom-count');if(count)count.textContent=state.customItems.length;}
  async function compressImage(file){
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Use PNG, JPEG ou WebP.');
    if(file.size>8*1024*1024)throw Error('Arquivo muito grande: máximo de 8 MB de origem.');
    const blobUrl=URL.createObjectURL(file);
    try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Não foi possível ler a imagem.'));i.src=blobUrl;});
      const ratio=Math.min(1,320/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));
      const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
      let result='';for(let q=.78;q>=.38;q-=.1){result=canvas.toDataURL('image/jpeg',q);if(result.length<135000)break;}
      if(result.length>=140000)throw Error('Imagem ainda muito grande. Tente outra foto.');return result;
    } finally {URL.revokeObjectURL(blobUrl);}
  }
  async function copyText(text){try{await navigator.clipboard.writeText(text);showToast('Copiado! Compartilhe com a galera.',true);}catch{state.modal={type:'copy-link',text};renderModal();}}
  function updateClock(){const r=state.room;if(!r||r.status!=='playing')return;syncBoardLock();if(r.turn_seconds===null||!r.turn_ends_at){const num=document.getElementById('clock-number');if(num)num.textContent='∞';return;}const ms=Date.parse(r.turn_ends_at)-(Date.now()+state.timeOffset);const sec=Math.max(0,Math.ceil(ms/1000));const num=document.getElementById('clock-number');if(num)num.textContent=String(sec).padStart(2,'0');const bar=document.getElementById('clock-fill');if(bar)bar.style.width=`${Math.max(0,Math.min(100,ms/(r.turn_seconds*1000)*100))}%`;const box=document.querySelector('.clock-box');if(box)box.classList.toggle('urgent',sec<=5);}
  async function adminAuth(){const email=document.getElementById('admin-email')?.value.trim(),password=document.getElementById('admin-password')?.value;if(!email||!password)return showToast('Preencha e-mail e senha.');await safeCall(async()=>{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;state.adminSession=data.session;await loadCatalog();renderAdmin();showToast('Login realizado!',true);});}
  async function adminUpload(file){if(!file)return'';if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Use PNG, JPEG ou WebP.');if(file.size>5*1024*1024)throw Error('Imagem acima de 5 MB.');
    const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw Error('Faça login administrativo.');
    const body=new FormData();body.append('file',file);body.append('game',cfg.mediaGame||'quem-e');
    const response=await fetch(`${cfg.mediaWorker.replace(/\/$/,'')}/upload`,{method:'POST',body,headers:{Authorization:`Bearer ${session.access_token}`}});
    const result=await response.json().catch(()=>({}));if(!response.ok||!result.url)throw Error((result.error||result.message||`Upload retornou HTTP ${response.status}`)+' — confirme se o Worker permite game="quem-e" e o domínio deste jogo no CORS.');
    return result.url;
  }
  async function saveCategory(){const input=document.getElementById('cat-name');const name=input?.value.trim();if(!name||name.length<2)return showToast('Informe um nome válido.');const emoji=document.getElementById('cat-emoji')?.value.trim()||'💥';const color=document.getElementById('cat-color')?.value||'#FFE600';const active=!!document.getElementById('cat-active')?.checked;
    await safeCall(async()=>{const row={name,emoji,color,active};let query=state.modal?.id?client.from('qe_categories').update(row).eq('id',state.modal.id):client.from('qe_categories').insert(row);const {error}=await query;if(error)throw error;state.modal=null;await loadCatalog();render();showToast('Tema salvo!',true);});}
  async function adminAddItem(){const name=document.getElementById('admin-new-name')?.value.trim(),image_url=document.getElementById('admin-new-image')?.value.trim()||null;if(!name)return showToast('Informe o nome do item.');if(image_url&&!safeImg(image_url))return showToast('URL da imagem inválida.');
    await safeCall(async()=>{const {error}=await client.from('qe_items').insert({category_id:state.adminCat,name,image_url});if(error)throw error;await loadCatalog();renderAdmin();showToast('Item adicionado!',true);});}
  async function adminSaveItem(){const name=document.getElementById('edit-item-name')?.value.trim();const image_url=document.getElementById('edit-item-image')?.value.trim()||null;if(!name)return showToast('Informe o nome do item.');if(image_url&&!safeImg(image_url))return showToast('URL da imagem inválida.');await safeCall(async()=>{const {error}=await client.from('qe_items').update({name,image_url}).eq('id',state.modal.id);if(error)throw error;state.modal=null;await loadCatalog();render();showToast('Item atualizado!',true);});}

  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    const type=button.dataset.action,id=button.dataset.id;
    try{

    if(type==='admin-back'){location.href='./';return;}
    if(type==='choose-create'){state.homeMode='create';render();return;}
    if(type==='choose-join'){state.homeMode='join';render();return;}
    if(type==='go-back'){state.homeMode='choices';render();return;}
    if(type==='create')return await create();
    if(type==='join')return await join();
    if(type==='leave-open'){state.modal={type:'leave'};return renderModal();}
    if(type==='leave')return await leave();
    if(type==='modal-close'){state.modal=null;document.getElementById('overlay')?.remove();return;}
    if(type==='copy')return await copyText(currentLink());
    if(type==='share'){if(navigator.share){try{await navigator.share({title:'Quem É?!',text:`Entre na sala ${state.room.code} e descubra quem você é!`,url:currentLink()});}catch{}}else await copyText(currentLink());return;}
    if(type==='qr-open'){state.modal={type:'qr'};return renderModal();}
    if(type==='choose-theme'){state.selectedCategory=id;state.count=Math.min(24,itemsFor(id).length);render();return;}
    if(type==='count-minus'){state.count=Math.max(16,state.count-1);render();return;}
    if(type==='count-plus'){state.count=Math.min(itemsFor(state.selectedCategory).length,state.count+1);render();return;}
    if(type==='confirm-theme')return await doAction('set_theme',{theme_id:state.selectedCategory,count:state.count});
    if(type==='set-time'){const seconds=button.dataset.seconds==='infinite'?null:Number(button.dataset.seconds);return await doAction('set_time',{seconds});}
    if(type==='start')return await doAction('start');
    if(type==='custom-open'){state.modal={type:'custom'};initialCustom();return renderModal();}
    if(type==='custom-add'){state.customItems.push({name:'',image_url:''});return updateCustomGrid();}
    if(type==='custom-add-8'){state.customItems.push(...Array.from({length:8},()=>({name:'',image_url:''})));return updateCustomGrid();}
    if(type==='custom-delete'){if(state.customItems.length<=16)return showToast('O mínimo é 16 opções.');state.customItems.splice(Number(button.dataset.idx),1);return updateCustomGrid();}
    if(type==='custom-bulk-add'){const txt=document.getElementById('custom-bulk')?.value||'';const lines=txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!lines.length)return showToast('Cole pelo menos um item.');let inserted=0;for(const line of lines){const blank=state.customItems.find(i=>!i.name.trim()&&!i.image_url);if(blank)blank.name=line.slice(0,90);else state.customItems.push({name:line.slice(0,90),image_url:''});inserted++;}document.getElementById('custom-bulk').value='';updateCustomGrid();return showToast(`${inserted} itens adicionados!`,true);}
    if(type==='custom-save'){const name=(document.getElementById('custom-title')?.value||'').trim();state.customTitle=name;const items=state.customItems.filter(i=>i.name.trim()).map(i=>({name:i.name.trim(),image_url:i.image_url||''}));if(name.length<2)return showToast('Dê um nome ao tema.');if(items.length<16)return showToast('Preencha ao menos 16 itens com nomes.');if(new Set(items.map(x=>x.name.toLocaleLowerCase())).size!==items.length)return showToast('Remova nomes repetidos.');await safeCall(async()=>{await act('set_custom',{name,items});state.modal=null;render();showToast('Seu tema está pronto para jogar!',true);});return;}
    if(type==='mark'){
      if(!canEditBoard()){syncBoardLock();return showToast('Só é possível marcar na sua vez.');}
      if(!state.room?.items.some(item=>item.id===id))return;
      if(state.boardMarks.has(id))state.boardMarks.delete(id);else state.boardMarks.add(id);
      saveMarks();
      const pos=document.getElementById('board-scroll')?.scrollTop||0;
      const grid=document.getElementById('board-grid');if(grid)grid.innerHTML=boardCards();
      const scroll=document.getElementById('board-scroll');if(scroll)scroll.scrollTop=pos;
      const stats=document.getElementById('board-stats');if(stats)stats.textContent=`${state.boardMarks.size}/${state.room.items.length}`;
      return;
    }
    if(type==='next')return await doAction('next');
    if(type==='guess-open'){if(!isMyTurn())return showToast('Espere a sua vez!');state.guessId=null;state.guessFilter='';state.showEliminated=false;state.modal={type:'guess'};return renderModal();}
    if(type==='guess-select'){state.guessId=id;return refreshGuess();}
    if(type==='guess-confirm'){if(!state.guessId)return showToast('Selecione uma opção.');state.modal={type:'guess-check'};renderModal();return;}
    if(type==='guess-back'){state.modal={type:'guess'};renderModal();return;}
    if(type==='guess-final'){
      if(state.busy)return;
      await safeCall(async()=>{
        const submittedId=state.guessId;
        await rpc('qe_action',{p_token:state.token,p_action:'guess',p_data:{item_id:submittedId}});
        pingPeers();
        await getState(true);
        const player=me();
        const rank=player?.rank||null;
        state.modal={type:'guess-result',correct:!!rank,rank,endsAt:Date.now()+5000};
        renderModal();
      });return;
    }
    if(type==='kick-open'){state.modal={type:'kick',playerId:id};return renderModal();}
    if(type==='kick-confirm'){await doAction('kick',{player_id:id});state.modal=null;render();return;}
    if(type==='new-game'){if(!isHost())return;await doAction('new_game');return;}
    if(type==='close-room-open'){if(!isHost())return;state.modal={type:'close-room'};return renderModal();}
    if(type==='close-room'){
      if(state.busy)return;
      state.busy=true;
      const token=state.token;
      try{
        await rpc('qe_action',{p_token:token,p_action:'close_room',p_data:{}});
        pingPeers();clearSession();state.modal=null;state.view='home';state.homeMode='choices';state.entryCode='';render();
      }catch(e){console.error(e);showToast(friendlyError(e));}finally{state.busy=false;}
      return;
    }
    if(type==='ready-again')return await doAction('ready_again');
    if(type==='admin-login')return await adminAuth();
    if(type==='admin-logout'){await client?.auth.signOut();state.adminSession=null;return renderAdmin();}
    if(type==='admin-select-cat'){state.adminCat=id;return renderAdmin();}
    if(type==='admin-new-cat'){state.modal={type:'admin-cat'};return renderModal();}
    if(type==='admin-edit-cat'){state.modal={type:'admin-cat',id:state.adminCat};return renderModal();}
    if(type==='admin-save-cat')return await saveCategory();
    if(type==='admin-delete-cat'){state.modal={type:'admin-delete',entity:'cat',id:state.adminCat,label:`Apagar ${categoryFor(state.adminCat)?.name} e todos os itens?`};renderModal();return;}
    if(type==='admin-add-item')return await adminAddItem();
    if(type==='admin-edit-item'){state.modal={type:'admin-item',id};return renderModal();}
    if(type==='admin-save-item')return await adminSaveItem();
    if(type==='admin-delete-item'){state.modal={type:'admin-delete',entity:'item',id,label:`Apagar ${state.items.find(i=>i.id===id)?.name}?`};renderModal();return;}
    if(type==='admin-delete-confirm'){const m=state.modal;await safeCall(async()=>{const q=m.entity==='cat'?'qe_categories':'qe_items';const {error}=await client.from(q).delete().eq('id',m.id);if(error)throw error;if(m.entity==='cat')state.adminCat=null;state.modal=null;await loadCatalog();render();showToast('Excluído.',true);});return;}
    }catch(e){console.error(e);showToast(friendlyError(e));}
  });
  document.addEventListener('input', event=>{
    const t=event.target;if(t.id==='player-name')state.name=t.value;
    if(t.id==='join-code')state.entryCode=t.value.toUpperCase();
    if(t.id==='item-count'){const max=itemsFor(state.selectedCategory).length;state.count=Math.max(16,Math.min(max,Number(t.value)||16));}
    if(t.id==='custom-title')state.customTitle=t.value;
    if(t.classList.contains('custom-name'))state.customItems[Number(t.dataset.idx)].name=t.value;
    if(t.id==='guess-search'){state.guessFilter=t.value;refreshGuess();}
  });
  document.addEventListener('change',async event=>{
    const t=event.target;
    if(t.id==='guess-show-elim'){state.showEliminated=t.checked;refreshGuess();}
    if(t.id==='item-count'){t.value=String(state.count);}
    if(t.classList.contains('custom-image')){
      const file=t.files?.[0];if(!file)return;
      await safeCall(async()=>{const src=await compressImage(file);state.customItems[Number(t.dataset.idx)].image_url=src;updateCustomGrid();showToast('Imagem adicionada!',true);});
    }
    if(t.id==='admin-image-file'||t.id==='admin-image-edit-file'){
      const file=t.files?.[0];if(!file)return;
      await safeCall(async()=>{showToast('Enviando a imagem...');const url=await adminUpload(file);const field=document.getElementById(t.id==='admin-image-file'?'admin-new-image':'edit-item-image');if(field)field.value=url;showToast('Imagem enviada ao R2!',true);});
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal){state.modal=null;document.getElementById('overlay')?.remove();}if(e.key==='Enter'&&e.target.id==='join-code'){e.preventDefault();void join();}if(e.key==='Enter'&&e.target.id==='player-name'){e.preventDefault();if(state.homeMode==='join')void join();else void create();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.token)void getState();});
  window.addEventListener('beforeunload',()=>{}); // Sem logout por refresh ou troca de aba.

  function persistLegacySession(saved){
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(saved));sessionStorage.removeItem('qs-session-v1');}catch{}
  }
  async function init(){
    const adminPage=location.pathname.endsWith('/admin.html');
    const code=new URL(location.href).searchParams.get('sala');if(code&&/^[a-zA-Z2-9]{6}$/.test(code)){state.entryCode=code.toUpperCase();state.homeMode='join';}
    let saved=null;try{saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||sessionStorage.getItem('qs-session-v1')||'null');if(saved?.token)persistLegacySession(saved);}catch{}
    if(saved?.token&&saved?.code){state.token=saved.token;state.code=saved.code;state.view='room';}
    if(adminPage)state.view='admin';
    render();
    try{await loadCatalog();if(adminPage&&client){const {data}=await client.auth.getSession();state.adminSession=data?.session||null;render();}if(state.view==='room'&&state.token){await getState(true);startLive();}else render();}catch(e){console.warn('Catalogo:',e);if(!state.token)render();if(client)showToast(friendlyError(e));}
  }
  void init();
})();
