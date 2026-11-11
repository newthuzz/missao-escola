// Shared by the browser and Worker: persisted values are catalog identifiers only.
export const avatarGroups={aurora:'Ilha da Aurora',forest:'Bosque Celeste',crystal:'Vale dos Cristais',lunar:'Arquipélago Lunar',peaks:'Picos do Saber',stellar:'Observatório Estelar'};
export const avatarModels={
 fox:{name:'Raposa cartógrafa',group:'aurora',note:'Um mapa, uma bússola e mil caminhos.'},
 rabbit:{name:'Coelho botânico',group:'aurora',note:'Leva sementes de novas descobertas.'},
 cat:{name:'Gato navegador',group:'aurora',note:'Sempre encontra uma trilha diferente.'},
 capybara:{name:'Capivara aventureira',group:'aurora',note:'Explora com calma e muita curiosidade.'},
 frog:{name:'Sapo alquimista',group:'forest',note:'Mistura ideias às margens do lago.'},
 bear:{name:'Urso guardião',group:'forest',note:'Guarda histórias entre as árvores.'},
 sprout:{name:'Espírito da semente',group:'forest',note:'Toda grande ideia começa pequena.'},
 mushroom:{name:'Cogumelo viajante',group:'forest',note:'Conhece os segredos do bosque.'},
 dragon:{name:'Dragão de ametista',group:'crystal',note:'Um pequeno guardião de grandes ideias.'},
 axolotl:{name:'Axolote das gemas',group:'crystal',note:'Brilha nas águas do vale.'},
 geode:{name:'Guardião do geodo',group:'crystal',note:'Um coração de cristal e muita coragem.'},
 jellyfish:{name:'Água-viva prismática',group:'crystal',note:'Flutua por um oceano de possibilidades.'},
 astronaut:{name:'Astronauta das ilhas',group:'lunar',note:'Próxima parada: uma nova descoberta.'},
 robot:{name:'Robô inventor',group:'lunar',note:'Transforma perguntas em invenções.'},
 alien:{name:'Visitante de Saturno',group:'lunar',note:'Veio de longe para aprender com você.'},
 mooncat:{name:'Gato da Lua',group:'lunar',note:'Coleciona estrelas e boas perguntas.'},
 penguin:{name:'Pinguim das expedições',group:'peaks',note:'Preparado para os ventos da montanha.'},
 snowfox:{name:'Raposa das neves',group:'peaks',note:'Lê os caminhos desenhados no gelo.'},
 yak:{name:'Iaque montanhista',group:'peaks',note:'Avança com paciência, passo a passo.'},
 owl:{name:'Coruja astrônoma',group:'peaks',note:'Observa o horizonte além dos picos.'},
 phoenix:{name:'Fênix da aurora',group:'stellar',note:'Cada tentativa acende um novo brilho.'},
 moth:{name:'Mariposa nebulosa',group:'stellar',note:'Segue a luz de uma boa ideia.'},
 comet:{name:'Espírito do cometa',group:'stellar',note:'Uma faísca de curiosidade pelo universo.'},
 starwhale:{name:'Baleia cósmica',group:'stellar',note:'Navega entre constelações e sonhos.'}
};
export const avatarPalettes={original:{name:'Original',colors:null},mint:{name:'Lago turquesa',colors:['#69d6c8','#287e86','#d4fff2','#102f4b']},violet:{name:'Ametista',colors:['#bda1f5','#7657b8','#f5d9ff','#302154']},sunset:{name:'Pôr do sol',colors:['#f3b16e','#c56c65','#fff0c3','#553347']}};
export const avatarAccessories={none:'Traje original',goggles:'Óculos de expedição',crown:'Coroa de cristal',headphones:'Fones das estrelas'};
export const legacyAvatars={'✦':'fox','☾':'owl','✿':'rabbit','♜':'robot'};
export function validAvatar(value){if(typeof value!=='string')return false;if(Object.hasOwn(legacyAvatars,value))return true;const parts=value.split('~');return (parts.length===1||parts.length===3)&&Object.hasOwn(avatarModels,parts[0])&&(parts.length===1||(Object.hasOwn(avatarPalettes,parts[1])&&Object.hasOwn(avatarAccessories,parts[2])));}
export function parseAvatar(value){const parts=validAvatar(value)?(legacyAvatars[value]||value).split('~'):['fox'];return {model:parts[0],palette:parts[1]||'original',accessory:parts[2]||'none'};}
export function encodeAvatar({model,palette='original',accessory='none'}){const value=palette==='original'&&accessory==='none'?model:`${model}~${palette}~${accessory}`;return validAvatar(value)?value:'fox';}
