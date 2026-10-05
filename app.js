(function(){
'use strict';
const D=window.GAME_DATA;
const $=s=>document.querySelector(s);
const screens=['home','create','join','lobbyHost','lobbyPlayer','hostGame','playerGame'].map(id=>$('#'+id));
const show=id=>screens.forEach(s=>s.classList.toggle('hidden',s.id!==id));
const rand=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const fmt=ms=>{let sec=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
let peer=null, hostPeer=null, conns=new Map(), myConn=null, timerFrame=null, roomCode='', role=null, roomConfig=null;

const players=$('#players'), spies=$('#spies'), duration=$('#duration'), validation=$('#validation');
for(let n=D.minPlayers;n<=D.maxPlayers;n++){let o=document.createElement('option');o.value=n;o.textContent=n+' jogadores';players.append(o)}
for(let n=0;n<=D.maxSpies;n++){let o=document.createElement('option');o.value=n;o.textContent=n+(n===1?' espião':' espiões');spies.append(o)}
players.value=6;spies.value=1;
function maxSpiesFor(n){return Math.min(D.maxSpies,n-1)}
function minSpiesFor(n){return Math.max(0,n-D.maxProfessions)}
function validate(){const p=+players.value,s=+spies.value,c=p-s;if(s>maxSpiesFor(p)){validation.textContent='Com '+p+' jogadores, o máximo é '+maxSpiesFor(p)+' espiões.';return false}if(s<minSpiesFor(p)){validation.textContent='Com '+p+' jogadores, é necessário pelo menos '+minSpiesFor(p)+' espião(ões) para cobrir a quantidade de jogadores.';return false}if(c>D.maxProfessions){validation.textContent='Não há profissões suficientes para esta configuração.';return false}validation.textContent='';return true}
players.addEventListener('change',()=>{for(const o of spies.options)o.disabled=+o.value>maxSpiesFor(+players.value);if(+spies.value>maxSpiesFor(+players.value))spies.value=maxSpiesFor(+players.value);if(+spies.value<minSpiesFor(+players.value))spies.value=minSpiesFor(+players.value);validate()});spies.addEventListener('change',validate);validate();

function roomId(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function playerId(){return 'p-'+Math.random().toString(36).slice(2,10)+'-'+Date.now().toString(36)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600)}
function stopTimer(){if(timerFrame)cancelAnimationFrame(timerFrame);timerFrame=null}
function startTimer(start,dur,els){stopTimer();function tick(){const left=start+dur*1000-Date.now();els.forEach(el=>{el.textContent=fmt(left);el.classList.toggle('danger',left<=10000)});if(left<=0){els.forEach(el=>{const st=el.parentElement.querySelector('.timer-status');if(st)st.textContent='Tempo encerrado'});timerFrame=null;return}timerFrame=requestAnimationFrame(tick)}tick()}
function updateSpyOptions(){for(const o of spies.options)o.disabled=+o.value>maxSpiesFor(+players.value);if(+spies.value>maxSpiesFor(+players.value))spies.value=maxSpiesFor(+players.value);if(+spies.value<minSpiesFor(+players.value))spies.value=minSpiesFor(+players.value)}
function summary(c){return `<span>${c.players} jogadores</span><span>${c.spies} espião${c.spies===1?'':'s'}</span><span>${Math.round(c.duration/60)} min</span>`}
function renderHostLobby(){const arr=[...conns.values()];$('#hostCount').textContent=arr.length+' / '+roomConfig.players;$('#hostPlayers').innerHTML='';arr.forEach((p,i)=>{const row=document.createElement('div');row.className='player-row';row.innerHTML='<span class="player-number">'+(i+1)+'</span><strong></strong><span class="connected">conectado</span>';row.querySelector('strong').textContent=p.name;$('#hostPlayers').append(row)});$('#startGame').disabled=arr.length!==roomConfig.players;$('#hostLobbyHint').textContent=arr.length===roomConfig.players?'Todos entraram. Você pode iniciar a partida!':'Aguardando '+(roomConfig.players-arr.length)+' jogador(es)...'}
function broadcast(msg){for(const c of conns.values()){try{c.conn.send(msg)}catch(e){}}}
function send(c,msg){try{c.send(msg)}catch(e){}}
function closeEverything(){stopTimer();for(const c of conns.values())try{c.conn.close()}catch(e){}conns.clear();if(myConn)try{myConn.close()}catch(e){}myConn=null;if(peer)try{peer.destroy()}catch(e){}peer=null;if(hostPeer)try{hostPeer.destroy()}catch(e){}hostPeer=null}

$('#createRoom').onclick=()=>{show('create');updateSpyOptions();validate()};
$('#showJoin').onclick=()=>show('join');
$('#backFromCreate').onclick=()=>show('home');
$('#backFromJoin').onclick=()=>show('home');
$('#cancelRoom').onclick=()=>{if(confirm('Encerrar esta sala?')){closeEverything();show('home')}};
$('#newHostRoom').onclick=()=>{closeEverything();show('home')};

$('#makeRoom').onclick=()=>{
 if(!validate())return;
 roomConfig={players:+players.value,spies:+spies.value,duration:+duration.value};
 roomCode=roomId();role='host';
 peer=new Peer(roomCode,{debug:1});
 peer.on('open',id=>{roomCode=id;$('#hostRoomCode').textContent=id;$('#settingsSummary').innerHTML=summary(roomConfig);renderHostLobby();show('lobbyHost')});
 peer.on('connection',conn=>{
   conn.on('open',()=>{conn.on('data',msg=>handleHostMessage(conn,msg));conn.on('close',()=>{const old=conns.get(conn.peer);conns.delete(conn.peer);renderHostLobby();if(old)toast(old.name+' saiu da sala.')});send(conn,{type:'room-info',config:roomConfig,count:conns.size});});
 });
 peer.on('error',err=>{if(err.type==='unavailable-id'){toast('Código ocupado. Criando outro...');try{peer.destroy()}catch(e){}setTimeout(()=>$('#makeRoom').click(),200)}else toast('Erro de conexão: '+err.type)});
};
function handleHostMessage(conn,msg){
 if(!msg||typeof msg!=='object')return;
 if(msg.type==='join'){
   if(conns.size>=roomConfig.players){send(conn,{type:'full'});return}
   const name=(String(msg.name||'Jogador').trim().slice(0,24)||'Jogador');
   if([...conns.values()].some(x=>x.name.toLowerCase()===name.toLowerCase())){send(conn,{type:'name-taken'});return}
   conns.set(conn.peer,{conn,name});
   send(conn,{type:'joined',name,config:roomConfig,count:conns.size});
   broadcast({type:'lobby-count',count:conns.size});renderHostLobby();
 }
}
$('#startGame').onclick=()=>{
 if(conns.size!==roomConfig.players)return;
 const loc=rand(D.locations), need=roomConfig.players-roomConfig.spies;
 if(need>loc.professions.length){toast('Esse local não tem profissões suficientes.');return}
 const cards=shuffle([...shuffle(loc.professions).slice(0,need),...Array.from({length:roomConfig.spies},()=>({spy:true}))]);
 const start=Date.now()+3500;
 [...conns.values()].forEach((p,i)=>{ const card=cards[i]; send(p.conn,{type:'start',loc:loc.name,card,start,dur:roomConfig.duration,player:i+1,cardImage:card.spy?null:card.image}); });
 $('#hostLocation').textContent=loc.name;$('#gameRoomCode').textContent=roomCode;$('#gameSummary').innerHTML=summary(roomConfig);show('hostGame');setTimeout(()=>startTimer(start,roomConfig.duration,[$('#hostTimer')]),0);
};

$('#joinRoom').onclick=()=>{
 const code=$('#roomCode').value.trim().toUpperCase(),name=$('#playerName').value.trim();
 $('#joinError').textContent='';
 if(!/^[A-Z0-9]{6}$/.test(code)){ $('#joinError').textContent='Digite o código de 6 caracteres da sala.';return }
 if(!name){$('#joinError').textContent='Digite seu nome.';return}
 roomCode=code;role='player';
 peer=new Peer(playerId(),{debug:1});
 peer.on('open',()=>{myConn=peer.connect(roomCode,{reliable:true});myConn.on('open',()=>send(myConn,{type:'join',name}));myConn.on('data',handlePlayerMessage);myConn.on('close',()=>{$('#joinError').textContent='A conexão com a sala foi encerrada.';show('join')});myConn.on('error',()=>{$('#joinError').textContent='Não foi possível conectar à sala.';show('join')})});
 peer.on('error',err=>{$('#joinError').textContent=err.type==='peer-unavailable'?'Sala não encontrada ou já encerrada.':'Erro de conexão: '+err.type});
};
function handlePlayerMessage(msg){
 if(!msg||typeof msg!=='object')return;
 if(msg.type==='room-info'){roomConfig=msg.config;$('#playerRoomCode').textContent=roomCode;$('#playerLobbyCount').textContent='Jogadores na sala: '+msg.count+' / '+roomConfig.players;show('lobbyPlayer')}
 if(msg.type==='joined'){roomConfig=msg.config;$('#playerRoomCode').textContent=roomCode;$('#playerLobbyCount').textContent='Jogadores na sala: '+msg.count+' / '+roomConfig.players;show('lobbyPlayer')}
 if(msg.type==='lobby-count'&&roomConfig){$('#playerLobbyCount').textContent='Jogadores na sala: '+msg.count+' / '+roomConfig.players}
 if(msg.type==='full'){myConn&&myConn.close();$('#joinError').textContent='Essa sala já está cheia.';show('join')}
 if(msg.type==='name-taken'){myConn&&myConn.close();$('#joinError').textContent='Esse nome já está sendo usado na sala.';show('join')}
 if(msg.type==='start'){openPlayerGame(msg)}
}
function openPlayerGame(data){
 const cardImg=$('#cardImage');
 const isSpy=!!data.card?.spy;
 $('#roleType').textContent=isSpy?'VOCÊ É':'SUA CARTA';
 $('#roleValue').textContent=isSpy?'ESPIÃO':data.card;
 $('#locationValue').textContent=isSpy?'Você é o espião. A carta não revela o local.':'Local: '+data.loc;
 const src=isSpy ? 'assets/cartas/folha-01-carta-01.png' : (data.cardImage || '');
 if(src){ cardImg.src=src; cardImg.alt=isSpy?'Carta de Espião':'Carta de '+data.card; cardImg.classList.remove('hidden'); } else { cardImg.classList.add('hidden'); }
 show('playerGame');
 startTimer(data.start,data.dur,[$('#playerTimer')]);
}
window.addEventListener('beforeunload',()=>closeEverything());
show('home');
})();
