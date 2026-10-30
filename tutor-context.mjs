// Public context identifiers. No answer keys, names or account tokens are included.
export function exerciseVersion(q) {
  const text=JSON.stringify([q.id,q.unitId,q.subject,q.level,q.question,q.answers||[],q.correct,q.explanation,q.hints||[]]);
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return (hash>>>0).toString(16).padStart(8,'0');
}
export function contextKey(value={}) {
  return value.exerciseId ? `${value.mode==='diagnostic'?'diagnostic':'study'}:${value.exerciseId}:${value.version}` : 'general';
}
