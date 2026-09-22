/* A complete, empty interaction - the same shape state() reads from the form -
   so each test only spells out what it cares about. */
const BASE = {
  initials: "TT", pronoun: "they", ratio: "", comm: [], flags: [],
  kind: "personal", slot: "am", setting: "community", sessionTo: "", learn: [], actOther: "",
  len: "std", time: "08:00", offerA: "", offerB: "", resp: "", chosen: "", how: [], consent: "",
  declined: "", level: "", tasks: [], ate: "", whatAte: "", drinkChoice: "", offered: "", drunk: "",
  skin: "", skinDetail: "", mood: [], well: [], risk: [], outcome: "", extra: "", handover: "",
  attest: false, staffing: "", commUsed: [], dignity: [], contObs: [], sleepObs: [], behaviour: [],
  behaviourOther: "", followup: [], prompts: {}
};

function makeState(over){
  return Object.assign(JSON.parse(JSON.stringify(BASE)), over || {});
}

/* the context every engine takes; the profile defaults to what the state carries */
function makeCtx(s, profile, extra){
  profile = Object.assign({ initials: s.initials, pronoun: s.pronoun, flags: s.flags, comm: s.comm }, profile || {});
  /* the form carries the person's details too; keep the two in step */
  s.initials = profile.initials; s.pronoun = profile.pronoun; s.flags = profile.flags; s.comm = profile.comm;
  return Object.assign({ s, profile }, extra || {});
}

module.exports = { makeState, makeCtx, BASE };
