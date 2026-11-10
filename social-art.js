// Original local vector illustrations; all markup comes from this fixed catalog.
export const avatars={fox:'Raposa viajante',owl:'Coruja curiosa',cat:'Gato explorador',frog:'Sapo do lago',bear:'Urso do bosque',rabbit:'Coelho das trilhas',robot:'Robô inventor',astronaut:'Astronauta'};
export const covers={aurora:'Ilha da Aurora',forest:'Bosque Celeste',crystal:'Vale dos Cristais',cosmos:'Observatório Estelar'};
export const frames={plain:'Brisa',leaf:'Folhagem',sun:'Luz do sol',orbit:'Órbita'};
export const titles=['Explorador de ideias','Viajante das ilhas','Guardião da curiosidade','Colecionador de perguntas'];
const legacy={'✦':'fox','☾':'owl','✿':'rabbit','♜':'robot'};
export function avatar(value='fox'){
 const id=avatars[value]?value:legacy[value]||'fox';
 const art={
 fox:'<path fill="#db763e" d="M22 58 15 18 43 34H57L85 18 78 58Q76 85 50 88 24 85 22 58"/><path fill="#ffe9c8" d="m24 53 26 16 26-16q-2 29-26 31Q26 82 24 53"/>',
 owl:'<path fill="#7e69aa" d="m20 27 15 8q15-8 30 0l15-8v40q-30 38-60 0Z"/><circle cx="36" cy="53" r="17" fill="#fff0cd"/><circle cx="64" cy="53" r="17" fill="#fff0cd"/><path d="m44 65 6 9 6-9" fill="#eda64f"/>',
 cat:'<path fill="#e9b54b" d="m20 64 2-43 22 17h12l22-17 2 43q-2 22-30 23-28-1-30-23"/><path d="m17 65 22 4m-22 7 22-2m44-9-22 4m22 7-22-2" stroke="#8d5e39" stroke-width="3"/>',
 frog:'<ellipse cx="50" cy="61" rx="35" ry="27" fill="#6da85d"/><circle cx="29" cy="39" r="15" fill="#8cc96b"/><circle cx="71" cy="39" r="15" fill="#8cc96b"/><path d="M30 67q20 16 40 0" fill="none" stroke="#244940" stroke-width="3"/><circle cx="29" cy="38" r="5" fill="#244940"/><circle cx="71" cy="38" r="5" fill="#244940"/>',
 bear:'<g fill="#ae7957"><circle cx="24" cy="31" r="16"/><circle cx="76" cy="31" r="16"/><ellipse cx="50" cy="58" rx="34" ry="31"/></g><ellipse cx="50" cy="72" rx="18" ry="13" fill="#f4d4a8"/>',
 rabbit:'<g fill="#e4d5ee"><ellipse cx="33" cy="29" rx="12" ry="25"/><ellipse cx="67" cy="29" rx="12" ry="25"/><ellipse cx="50" cy="64" rx="32" ry="26"/></g><path d="M33 11v25m34-25v25" stroke="#ce9bb4" stroke-width="7" stroke-linecap="round"/>',
 robot:'<path d="M50 20V10" stroke="#86ada9" stroke-width="5"/><circle cx="50" cy="10" r="5" fill="#e8b94d"/><rect x="17" y="27" width="66" height="58" rx="16" fill="#83b5b2"/><rect x="26" y="39" width="48" height="28" rx="9" fill="#27434d"/><path d="M38 76h24" stroke="#e5f3df" stroke-width="5"/><circle cx="37" cy="53" r="5" fill="#f3d675"/><circle cx="63" cy="53" r="5" fill="#f3d675"/>',
 astronaut:'<circle cx="50" cy="50" r="37" fill="#d4e8e9"/><rect x="15" y="41" width="9" height="24" rx="4" fill="#8ba2bf"/><rect x="76" y="41" width="9" height="24" rx="4" fill="#8ba2bf"/><rect x="24" y="29" width="52" height="43" rx="20" fill="#435a83"/><path d="m32 42 10-6" stroke="#acc8ec" stroke-width="5" stroke-linecap="round"/><path d="M36 80h28" stroke="#e8b94d" stroke-width="5"/>'
 };
 const face=['frog','robot','astronaut'].includes(id)?'':`<g fill="#273f40"><circle cx="36" cy="55" r="4"/><circle cx="64" cy="55" r="4"/><path d="m45 69 5 5 5-5Z"/></g>`;
 return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49" fill="#e4eddb"/>${art[id]}${face}</svg>`;
}
export function landscape(value='aurora'){
 const id=covers[value]?value:'aurora',pal={aurora:['#bce4ca','#f9d779','#79b799','#397f72'],forest:['#a4d9c6','#e7efaf','#4e9b89','#286762'],crystal:['#d9d1ef','#fff0c1','#9b91c9','#625a9e'],cosmos:['#27385a','#f3daa0','#7279ab','#444d7a']}[id];
 return `<svg viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path fill="${pal[0]}" d="M0 0h640v220H0z"/><circle cx="505" cy="58" r="29" fill="${pal[1]}"/><path d="m0 170 110-80 95 49 126-99 151 105 91-54 67 48v81H0" fill="${pal[2]}"/><path d="M0 196q100-83 220-20t220-12 200 2v54H0" fill="${pal[3]}"/><path d="M320 220q-88-25-21-53t-8-35" fill="none" stroke="${pal[1]}" stroke-width="10" opacity=".65"/>${id==='forest'?'<g fill="#286762"><path d="m85 162 32-74 32 74zm64 8 26-60 26 60zm300-23 25-60 25 60z"/></g>':id==='crystal'?'<g fill="#e9e3ff"><path d="m100 175 12-55 28 40-18 26zm330-26 12-55 28 40-18 26z"/></g>':id==='cosmos'?'<g fill="#fff0c1"><circle cx="85" cy="36" r="3"/><circle cx="210" cy="69" r="3"/><circle cx="357" cy="25" r="3"/><path d="m435 73 3-8 3 8 8 3-8 3-3 8-3-8-8-3z"/></g>':''}</svg>`;
}
export function emblem(tier=0){
 const motifs=[
  '<circle cx="50" cy="53" r="16"/><path d="M50 27v-7m0 66v-7M24 53h-7m66 0h-7M31 34l-5-5m48 48-5-5m0-38 5-5M31 72l-5 5" fill="none" stroke="#f5dfa4" stroke-width="4"/>',
  '<path d="M50 83V36M49 60Q19 58 26 33q29 1 23 27M51 72q29-2 25-28-28 0-25 28" stroke="#f5dfa4" stroke-width="3"/>',
  '<path d="m50 24 23 24-9 30-14 11-14-11-9-30Z"/><path d="m50 24-8 28 8 37 8-37Zm-23 24 15 4 16 0 15-4" fill="none" stroke="#8062a3" stroke-width="3"/>',
  '<path d="m50 24 8 21 22 5-18 14 1 23-13-12-16 12 3-23-18-14 23-5Z"/><circle cx="26" cy="29" r="3"/><circle cx="76" cy="80" r="3"/>'
 ];
 return `<svg viewBox="0 0 100 110" aria-hidden="true"><path d="M50 5 90 25v38q-5 24-40 41Q15 87 10 63V25Z" fill="${['#397f72','#456f99','#8062a3','#565a99'][tier]||'#397f72'}" stroke="#edce85" stroke-width="5"/><g fill="#f5dfa4">${motifs[tier]||motifs[0]}</g></svg>`;
}
