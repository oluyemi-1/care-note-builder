/* Everything the app can say, and every choice it offers. Plain data, so a
   manager can read and approve all of it before rollout. */
(function (G) {
"use strict";

/* ---------- option sets ---------- */
const COMM = [
  ["verbal","Short, clear speech"],
  ["makaton","Makaton signing"],
  ["pictures","Pictures / communication book"],
  ["nownext","Now and Next board"],
  ["objects","Objects of reference"],
  ["gesture","Gesture and body language"]
];
/* Standing needs and risks. They shape which questions are asked; they never
   write a sentence on their own. */
const FLAGS = [
  ["diabetes","Diabetes"], ["cholesterol","Cholesterol management"],
  ["softdiet","Modified diet or texture"], ["choking","Choking risk"],
  ["skin","Skin integrity monitoring"], ["epilepsy","Epilepsy"],
  ["deaf","Hearing impairment"], ["vision","Visual impairment"],
  ["continence","Continence plan"], ["anxiety","Anxiety"],
  ["fluids","Fluid target"], ["privacy","Same-gender care preferred"]
];
const RESP = [
  ["choseA","Chose the first option"], ["choseB","Chose the second option"],
  ["agreed","Agreed to what was offered"], ["nonverbal","Showed a clear non-verbal choice"],
  ["delayed","Declined at first, then agreed"], ["declined","Declined"], ["noresp","No clear response"]
];
const HOW = [
  ["said","Told staff"], ["pointed","Pointed"], ["signed","Signed"],
  ["nodded","Nodded"], ["led","Led staff to it"], ["reached","Reached for it"], ["facial","Facial expression"]
];
const CONSENT = [["yes","Consent given"],["implied","Consent implied through cooperation"],["no","Consent not given"]];
const SKIN = [["clear","Observed &mdash; nothing new"],["concern","Observed &mdash; something new"],["none","Not observed this time"]];
const MOOD = [["settled","Settled"],["cheerful","Cheerful"],["quiet","Quiet"],["chatty","Chatty"],["tired","Tired"],["anxious","Anxious"],["unsettled","Unsettled"]];
const WELL = [["nochange","No change from usual"],["appetite","Appetite changed"],["pain","Signs of discomfort"],["cough","Coughing"],["sleep","Slept poorly"]];
const RISK = [
  ["sight","Stayed within sight"], ["road","Walked on the traffic side"],
  ["toilet","Toilet before leaving"], ["accessible","Found an accessible toilet"],
  ["space","Kept walking path clear"], ["plan","Explained the plan in advance"],
  ["seatbelt","Seatbelt worn"], ["doortodoor","Escorted door to door"],
  ["stop","Waited together at the stop"], ["fare","Staff held the fare or ticket"],
  ["crossing","Supported at crossings"]
];
const OUTCOME = [
  ["ready","Clean, comfortable and ready for the day"],
  ["settled","Settled afterwards"],
  ["enjoyed","Enjoyed it and would do it again"],
  ["proud","Pleased with what they had done"],
  ["home","Returned home safely and settled"],
  ["nightsettled","Settled in bed and comfortable"],
  ["slept","Settled and asleep at the next check"],
  ["resettled","Resettled without distress"],
  ["later","Declined for now &mdash; to be offered again later"],
  ["nochangeout","No concerns; usual routine resumed"]
];
const ACTS = [
  ["college","College","{p} college session","attended college"],
  ["laundry","Laundry","the laundry","did the laundry"],
  ["cooking","Cooking","the cooking","did the cooking"],
  ["baking","Baking","the baking","did some baking"],
  ["shopping","Shopping","the shopping","did the shopping"],
  ["housework","Housework","the housework","did the housework"],
  ["gardening","Gardening / allotment","the gardening","did some gardening"],
  ["walk","Walk","a walk","went for a walk"],
  ["bus","Bus ride","a bus ride","went for a bus ride"],
  ["park","Park","the park","spent time at the park"],
  ["swim","Swimming","swimming","went swimming"],
  ["cinema","Cinema","the cinema","went to the cinema"],
  ["cafe","Cafe / eating out","a cafe trip","went to the cafe"],
  ["church","Church / worship","church","went to church"],
  ["daycentre","Day centre","the day centre","attended the day centre"],
  ["volunteering","Volunteering / work placement","{p} volunteering placement","attended {p} volunteering placement"],
  ["music","Music","music","took part in music"],
  ["arts","Arts &amp; crafts","arts and crafts","did arts and crafts"],
  ["games","Games / puzzles","a game","played a game"],
  ["film","TV / film at home","TV or a film","watched TV or a film"],
  ["exercise","Exercise / gym","exercise","did some exercise"],
  ["appt","Appointment","{p} appointment","attended {p} appointment"],
  ["family","Family visit","a family visit","had a family visit"],
  ["drive","Drive out","a drive out","went out for a drive"],
  ["other","Something else","the activity","took part in the activity"]
];
/* an activity cannot end "ready for the day"; a morning wash cannot end "asleep" */
const OUT_SCOPE = {
  ready:        {kinds:["personal"], slots:["am","pm","continence"]},
  settled:      {kinds:["personal","eating","activity"]},
  enjoyed:      {kinds:["eating","activity"]},
  proud:        {kinds:["eating","activity"]},
  home:         {kinds:["activity"]},
  nightsettled: {kinds:["personal"], slots:["pm","night"]},
  slept:        {kinds:["personal"], slots:["pm","night"]},
  resettled:    {kinds:["personal"], slots:["pm","night"]},
  later:        {kinds:["personal","eating","activity"]},
  nochangeout:  {kinds:["personal","eating","activity"]}
};

/* Where each activity happens. "out" means in the community, so road, travel
   and toilet-planning prompts apply; "home" means they do not, and a journey
   recorded against one is worth a second look; "either" depends on whether a
   journey was recorded. Tags let rules pick out, say, water-based activities. */
const ACT_INFO = {
  college:{where:"out"}, laundry:{where:"home", tags:["laundry"]}, cooking:{where:"home", tags:["food"]},
  baking:{where:"home", tags:["food"]}, shopping:{where:"out", tags:["shopping"]}, housework:{where:"home", tags:["chores"]},
  gardening:{where:"either", tags:["garden"]}, walk:{where:"out", tags:["walking"]}, bus:{where:"out", tags:["transport"]},
  park:{where:"out", tags:["walking"]}, swim:{where:"out", tags:["water","physical"]}, cinema:{where:"out"},
  cafe:{where:"out", tags:["food"]}, church:{where:"out"}, daycentre:{where:"out"},
  volunteering:{where:"out"}, music:{where:"either", tags:["music"]}, arts:{where:"either", tags:["arts"]}, games:{where:"home"},
  film:{where:"home"}, exercise:{where:"either", tags:["physical"]}, appt:{where:"out"},
  family:{where:"either"}, drive:{where:"out", tags:["transport"]}, other:{where:"either"},
  /* college courses that are not also an activity above */
  dance:{where:"out", tags:["music","physical"]}, singing:{where:"out", tags:["music"]}, allotment:{where:"out", tags:["garden"]},
  art:{where:"out", tags:["arts"]}
};

/* What the person did during the activity - the particular events staff want
   in the note, offered only for the kind of activity in hand. Each tick is
   exactly one sentence; nothing is written for an activity on its own. */
const DURING = {};
DURING.food = [["food-hands","Washed hands before handling food"],["food-ingredients","Chose the ingredients"],
               ["food-recipe","Followed the recipe"],["food-hob","Used the hob or oven safely"],
               ["food-served","Served the food"],["food-tasted","Tasted what they had made"]];
DURING.music = [["music-chose","Chose the music"],["music-sang","Sang along"],["music-instrument","Played an instrument"],
                ["music-danced","Danced"],["music-listened","Listened and kept time"]];
DURING.arts = [["arts-materials","Chose the materials"],["arts-made","Made something of their own design"],
               ["arts-showed","Showed their work to others"]];
DURING.physical = [["physical-warmup","Joined in the warm-up"],["physical-pace","Set their own pace"],
                   ["physical-rest","Took a rest when they needed one"]];
DURING.water = [["water-changed","Got changed for the water"],["water-swam","Swam or moved about in the water"]];
DURING.walking = [["walking-route","Chose the route"],["walking-stopped","Stopped to look at things on the way"]];
DURING.shopping = [["shopping-list","Used a shopping list"],["shopping-items","Chose the items"],["shopping-bags","Carried the bags"]];
DURING.garden = [["garden-planted","Planted or watered"],["garden-tools","Used garden tools"]];
DURING.laundry = [["laundry-sorted","Sorted the washing"],["laundry-machine","Loaded and started the machine"],["laundry-folded","Folded the clean washing"]];
DURING.chores = [["chores-room","Tidied their own room"],["chores-hoover","Hoovered or dusted"]];
const DURINGBANK = {
 "food-hands":["{S} washed {p} hands before handling food.","Before handling food, {s} washed {p} hands."],
 "food-ingredients":["{S} chose the ingredients.","{S} picked out the ingredients."],
 "food-recipe":["{S} followed the recipe.","{S} worked through the recipe."],
 "food-hob":["{S} used the hob or oven safely.","{S} used the hob or oven without incident."],
 "food-served":["{S} served the food.","{S} served up the food."],
 "food-tasted":["{S} tasted what {s} had made.","{S} tried what {s} had made."],
 "music-chose":["{S} chose the music.","{S} picked the music."],
 "music-sang":["{S} sang along.","{S} joined in with the singing."],
 "music-instrument":["{S} played an instrument.","{S} played along on an instrument."],
 "music-danced":["{S} danced.","{S} danced to the music."],
 "music-listened":["{S} listened and kept time with the music.","{S} kept time with the music."],
 "arts-materials":["{S} chose the materials.","{S} picked out the materials {s} wanted to use."],
 "arts-made":["{S} made something of {p} own design.","{S} made a piece of {p} own design."],
 "arts-showed":["{S} showed {p} work to others.","{S} showed others what {s} had made."],
 "physical-warmup":["{S} joined in the warm-up.","{S} took part in the warm-up."],
 "physical-pace":["{S} set {p} own pace.","{S} went at {p} own pace."],
 "physical-rest":["{S} took a rest when {s} needed one.","{S} rested when {s} needed to."],
 "water-changed":["{S} got changed for the water.","{S} changed into {p} swimwear."],
 "water-swam":["{S} swam and moved about in the water.","{S} moved about in the water."],
 "walking-route":["{S} chose the route.","{S} decided which way to go."],
 "walking-stopped":["{S} stopped to look at things on the way.","{S} took time to look at things along the way."],
 "shopping-list":["{S} used a shopping list.","{S} worked from a shopping list."],
 "shopping-items":["{S} chose the items.","{S} picked the items {s} wanted."],
 "shopping-bags":["{S} carried the bags.","{S} carried the shopping."],
 "garden-planted":["{S} planted and watered.","{S} did some planting and watering."],
 "garden-tools":["{S} used garden tools.","{S} worked with garden tools."],
 "laundry-sorted":["{S} sorted the washing.","{S} sorted the washing into loads."],
 "laundry-machine":["{S} loaded and started the machine.","{S} loaded the machine and started it."],
 "laundry-folded":["{S} folded the clean washing.","{S} folded the washing once it was dry."],
 "chores-room":["{S} tidied {p} own room.","{S} tidied {p} room."],
 "chores-hoover":["{S} hoovered and dusted.","{S} did the hoovering and dusting."]
};

/* the overall level in step 3, most to least independent */
const OVERALL_LEVELS = [["ind","Fully independent"],["prompt","Prompting only"],["min","Minimal hands-on support"],
                        ["part","Part hands-on support"],["full","Full hands-on support"]];

const SLOTS = {
  personal:[["am","Personal Care &mdash; AM"],["pm","Personal Care &mdash; PM"],["night","Personal Care &mdash; Night"],["continence","Continence support"]],
  eating:[["breakfast","Breakfast"],["lunch","Lunch"],["dinner","Dinner"],["snack","Snack"],["fluids","Daily Fluid Intake"]],
  activity: ACTS.map(a => [a[0], a[1]])
};

/* ---------- tasks: each row mirrors a field in the care records system ---------- */
/* No default. A blank level means the row says nothing, rather than claiming
   the person did it unaided because nobody touched the dropdown. */
const LEVELS = [["","How much support?"],["ind","Did it themselves"],["prompt","With prompting"],
                ["min","Minimal help"],["part","Part-supported"],["full","Staff did it"],["declined","Declined"]];

/* Each sentence says only what the row records: the task, how much support,
   and the option picked. Nothing about water temperature, which areas, or
   how it felt - staff record those elsewhere if they happened.
   verb  what the person did, for sentences that group several tasks
   noun  the task as a thing, for "staff supported with ..." / "declined ..."
   A task with options has no noun, so a grouped sentence can never drop the
   option that was picked. "min" comes from the verb unless a task has its own. */
const TASKS = {
personal:[
 {id:"wash",label:"Washing",nf:"Method of Hygiene",opts:["a shower","a bath","a strip wash","a bed bath","a wash at the sink"],
  verb:"had {opt}",
  ind:["{S} had {opt} independently.","{S} managed {opt} on {p} own, with no hands-on help.","{S} completed {opt} without support."],
  prompt:["{S} had {opt}, completing it {r} with prompts from staff.","With prompts from staff, {s} washed {r} during {opt}.","{S} had {opt} and needed only prompting."],
  part:["During {opt}, {s} washed the areas {s} could manage and staff supported with the rest.","{S} had {opt}; {s} did as much as {s} could {r} and staff supported with the rest.","{S} had {opt} with part support from staff."],
  full:["Staff provided full support with {opt}.","{S} had {opt} with full support from staff.","Staff carried out {opt} for {o}."],
  declined:["{S} declined {opt} on this occasion.","{S} did not want {opt} and this was respected."]},

 {id:"hair",label:"Hair washing",nf:"Hair Washing",verb:"washed {p} hair",noun:"washing {p} hair",
  ind:["{S} washed {p} own hair.","{S} washed {p} hair without help."],
  prompt:["{S} washed {p} hair after a prompt from staff.","{S} washed {p} hair {r} once staff prompted {o}."],
  part:["{S} washed {p} hair with some hands-on help from staff.","{S} did part of washing {p} hair and staff supported with the rest."],
  full:["Staff washed {p} hair.","Staff washed {p} hair for {o}."],
  declined:["{S} declined to have {p} hair washed today.","{S} chose not to wash {p} hair and this was respected."]},

 {id:"shave",label:"Shaving",nf:"Shaving",verb:"shaved",noun:"shaving",
  ind:["{S} shaved {r}.","{S} shaved independently."],
  prompt:["{S} shaved {r} after a prompt from staff.","{S} shaved with prompts from staff."],
  part:["{S} shaved part of {p} face and staff finished the rest.","{S} shaved with some hands-on help from staff."],
  full:["Staff shaved {o}.","Staff carried out {p} shave."],
  declined:["{S} declined a shave today.","{S} did not want to shave and this was respected."]},

 {id:"oral",label:"Oral care",nf:"Oral Care",opts:["{p} teeth","{p} teeth with an electric toothbrush","{p} dentures"],
  verb:"brushed {opt}",
  ind:["{S} brushed {opt} without any support.","{S} carried out {p} own oral care, brushing {opt}."],
  prompt:["{S} brushed {opt} after a prompt.","With prompting, {s} brushed {opt} {r}."],
  part:["{S} started brushing {opt} and staff supported to finish.","{S} brushed {opt} with some hands-on help from staff."],
  full:["Staff carried out oral care for {o}, brushing {opt}.","Staff brushed {opt} for {o}."],
  declined:["{S} declined to have {opt} brushed on this occasion.","{S} did not want support with {opt} and this was respected."]},

 {id:"nails",label:"Nail care",nf:"Nail Care",verb:"cared for {p} nails",noun:"nail care",
  ind:["{S} attended to {p} own nails.","{S} cared for {p} nails {r}."],
  prompt:["{S} attended to {p} nails after a prompt from staff.","With prompting, {s} cared for {p} nails."],
  part:["{S} cared for {p} nails with some hands-on help from staff.","{S} did part of {p} nail care and staff supported with the rest."],
  full:["Staff attended to {p} nails.","Staff carried out {p} nail care."],
  declined:["{S} declined nail care today.","{S} did not want {p} nails done and this was respected."]},

 {id:"creams",label:"Creams",nf:"Creams Applied as per MAR chart",verb:"applied {p} prescribed cream",noun:"{p} prescribed cream",
  ind:["{S} applied {p} prescribed cream {r}.","{S} put on {p} own prescribed cream."],
  prompt:["{S} applied {p} prescribed cream after a prompt from staff.","Following a prompt, {s} applied {p} prescribed cream."],
  part:["{S} applied {p} prescribed cream to the areas {s} could reach and staff applied the rest.","{S} applied some of {p} prescribed cream and staff supported with the rest."],
  full:["Staff applied {p} prescribed cream.","{P} prescribed cream was applied by staff."],
  declined:["{S} declined {p} prescribed cream.","{S} did not want {p} prescribed cream on this occasion."]},

 {id:"dress",label:"Dressing &amp; clothing choice",nf:"Choice of clothing made?",verb:"dressed in clothes {s} chose",noun:"dressing",
  ind:["{S} chose {p} own clothes and dressed without help.","{S} picked out {p} clothes and dressed {r}."],
  prompt:["{S} chose {p} clothes and dressed {r} with prompts from staff.","{S} selected {p} clothes and dressed following prompts."],
  part:["{S} chose {p} clothes and dressed with some hands-on help from staff.","{S} chose {p} clothes and staff supported with part of dressing."],
  full:["Staff dressed {o}.","Staff supported {o} fully with dressing."],
  declined:["{S} declined to change {p} clothes at this point.","{S} kept on the clothes {s} {vbe} wearing."]},

 {id:"continence",label:"Continence support",nf:"Continence chart",verb:"used the toilet",noun:"using the toilet",
  ind:["{S} used the toilet independently.","{S} took {r} to the toilet without support."],
  prompt:["{S} used the toilet after a prompt from staff.","Following a prompt, {s} used the toilet {r}."],
  part:["{S} used the toilet with some hands-on help from staff.","Staff supported {o} to use the toilet, and {s} did part of it {r}."],
  full:["Staff provided full continence support.","Continence support was given by staff."],
  declined:["{S} declined support with the toilet at this time.","{S} did not want continence support and this was respected."]},

 {id:"hearing",label:"Hearing aids",nf:"Hearing Aid(s)",verb:"put in {p} hearing aids",noun:"{p} hearing aids",
  ind:["{S} put in {p} hearing aids {r}.","{S} fitted {p} own hearing aids."],
  prompt:["{S} put in {p} hearing aids after a prompt.","Following a prompt, {s} fitted {p} hearing aids."],
  part:["Staff helped {o} to fit {p} hearing aids.","{S} fitted {p} hearing aids with some hands-on help."],
  full:["Staff fitted {p} hearing aids.","{P} hearing aids were fitted by staff."],
  declined:["{S} declined to wear {p} hearing aids today.","{S} chose not to wear {p} hearing aids."]},

 {id:"glasses",label:"Glasses / lenses",nf:"Glasses / Contact Lenses",verb:"put on {p} glasses",noun:"{p} glasses",
  ind:["{S} put on {p} glasses {r}.","{S} put on {p} glasses without help."],
  prompt:["{S} put on {p} glasses after a prompt.","Following a prompt, {s} put on {p} glasses."],
  part:["{S} put on {p} glasses with some help from staff.","Staff helped {o} to put on {p} glasses."],
  full:["Staff put {p} glasses on for {o}.","Staff fitted {p} glasses for {o}."],
  declined:["{S} declined to wear {p} glasses today.","{S} chose not to wear {p} glasses."]},

 {id:"aids",label:"Assistive aids",nf:"Assistive Aids Checked, Cleaned & Issued",verb:"used {p} assistive aids",noun:"{p} assistive aids",
  ind:["{S} collected and used {p} own equipment.","{S} used {p} assistive aids without support."],
  prompt:["{S} used {p} equipment after a prompt from staff.","Following a prompt, {s} used {p} assistive aids."],
  part:["{S} used {p} assistive aids with some help from staff.","Staff helped {o} to use {p} equipment."],
  full:["Staff checked, cleaned and issued {p} equipment.","{P} assistive aids were checked, cleaned and issued by staff."],
  declined:["{S} declined to use {p} equipment on this occasion.","{S} chose not to use {p} assistive aids."]},

 {id:"jewellery",label:"Watch &amp; jewellery",nf:"Watch & Jewellery",verb:"put on {p} watch and jewellery",noun:"{p} watch and jewellery",
  ind:["{S} chose and put on {p} own watch and jewellery.","{S} put on the jewellery {s} wanted to wear."],
  prompt:["{S} put on {p} watch and jewellery after a prompt.","Following a prompt, {s} put on {p} watch and jewellery."],
  part:["{S} chose {p} jewellery and staff helped fasten it.","Staff helped {o} put on the watch and jewellery {s} chose."],
  full:["Staff put on {p} watch and jewellery for {o}.","Staff fitted {p} watch and jewellery."],
  declined:["{S} chose not to wear jewellery today.","{S} declined {p} watch and jewellery."]},

 {id:"nightwear",label:"Night clothes",nf:"Choice of clothing made?",verb:"changed into {p} night clothes",noun:"changing into {p} night clothes",
  ind:["{S} chose {p} night clothes and changed independently.","{S} got changed for bed without any help."],
  prompt:["{S} changed into {p} night clothes after a prompt.","With prompting, {s} changed into {p} night clothes."],
  part:["{S} changed into {p} night clothes with some hands-on help from staff.","Staff supported {o} to change into {p} night clothes, and {s} did part of it {r}."],
  full:["Staff supported {o} fully to change into {p} night clothes.","Staff changed {o} into {p} night clothes."],
  declined:["{S} preferred to stay in what {s} {vbe} wearing and this was respected.","{S} declined to change for bed."]},

 {id:"reposition",label:"Repositioning",nf:"Repositioning chart",verb:"changed position in bed",noun:"repositioning",
  ind:["{S} repositioned {r} in bed.","{S} changed position {r}."],
  prompt:["{S} repositioned {r} after a prompt from staff.","Following a prompt, {s} changed position {r}."],
  part:["{S} changed position with some hands-on help from staff.","Staff supported {o} to reposition, and {s} did part of it {r}."],
  full:["Staff repositioned {o}.","Staff changed {p} position."],
  declined:["{S} did not want to be repositioned and this was respected.","{S} declined repositioning at this time."]},

 {id:"settle",label:"Settling for the night",nf:"Daily note",verb:"settled for the night",noun:"settling for the night",
  ind:["{S} took {r} to bed when {s} {vbe} ready.","{S} decided when to go to bed and settled independently."],
  prompt:["{S} went to bed after a prompt from staff.","Following a prompt, {s} settled for the night."],
  part:["{S} got into bed with some hands-on help from staff.","Staff supported {o} to get into bed, and {s} did part of it {r}."],
  full:["Staff supported {o} fully to settle into bed.","Staff settled {o} for the night."],
  declined:["{S} {vbe} not ready for bed and chose to stay up.","{S} declined to settle at this point."]},

 {id:"sleepcheck",label:"Night check",nf:"Night checks",
  ind:["{S} needed no support at the night check.","No support was needed at the night check."],
  prompt:["{S} needed only verbal reassurance at the night check.","At the night check, {s} needed verbal reassurance only."],
  min:["{S} needed minimal hands-on support at the night check.","Minimal hands-on support was given at the night check."],
  part:["Staff gave {o} some hands-on support at the night check.","{S} {vbe} given some hands-on support at the night check."],
  full:["Staff carried out the night check.","A night check was completed by staff."],
  declined:["{S} asked not to be disturbed at the night check.","{S} declined the night check."]},

 {id:"makeup",label:"Make up",nf:"Make Up",verb:"applied {p} make up",noun:"{p} make up",
  ind:["{S} applied {p} own make up.","{S} did {p} make up without support."],
  prompt:["{S} applied {p} make up after a prompt.","{S} did {p} make up following a prompt."],
  part:["{S} applied some of {p} make up and staff supported with the rest.","{S} did {p} make up with some help from staff."],
  full:["Staff applied {p} make up.","Staff did {p} make up for {o}."],
  declined:["{S} declined make up today.","{S} chose not to wear make up."]}
],

eating:[
 {id:"choose",label:"Choosing the meal",nf:"Choices Offered",verb:"chose {p} meal",noun:"choosing {p} meal",
  ind:["{S} decided what {s} wanted without any help.","{S} chose {p} meal independently."],
  prompt:["{S} chose {p} meal after prompting from staff.","With prompting, {s} made {p} choice of meal."],
  part:["{S} chose {p} meal with some support from staff.","Staff supported {o} to choose {p} meal."],
  full:["Staff made the choice of meal on {p} behalf.","The meal was chosen by staff on {p} behalf."],
  declined:["{S} did not want to choose a meal at this point.","{S} declined to choose a meal."]},

 {id:"prep",label:"Preparing the meal",nf:"Daily note",verb:"prepared the meal",noun:"preparing the meal",
  ind:["{S} prepared the meal {r}.","{S} made the meal independently."],
  prompt:["{S} prepared the meal with prompts from staff.","{S} made the meal following prompts from staff."],
  part:["{S} prepared part of the meal and staff supported with the rest.","{S} prepared the meal with some hands-on help from staff."],
  full:["Staff prepared the meal.","The meal was prepared by staff."],
  declined:["{S} did not want to help prepare the meal today.","{S} declined to take part in preparing the meal."]},

 {id:"eat",label:"Eating",nf:"Amount Eaten (%)",verb:"ate {p} meal",noun:"eating",
  ind:["{S} ate independently.","{S} ate the meal without any support."],
  prompt:["{S} ate {r} with prompting from staff.","{S} ate {r}, with prompts from staff to keep going."],
  part:["{S} ate with some hands-on help from staff.","{S} ate {r} for part of the meal, and staff supported {o} for the rest."],
  full:["Staff supported {o} to eat.","Staff gave {o} full support to eat."],
  declined:["{S} declined the meal.","{S} did not want to eat at this time."]},

 {id:"drink",label:"Drinking",nf:"Daily Fluid Intake",verb:"had {p} drink",noun:"drinking",
  ind:["{S} had {p} drink without support.","{S} drank independently."],
  prompt:["{S} drank after a prompt from staff.","Following a prompt, {s} had {p} drink."],
  part:["{S} drank with some hands-on help from staff.","Staff supported {o} with part of {p} drink."],
  full:["Staff supported {o} to drink.","Staff gave {o} full support with {p} drink."],
  declined:["{S} declined a drink at this point.","{S} did not want a drink."]}
],

activity:[
 {id:"plan",label:"Planning &amp; preparing",nf:"Daily note",phase:"start",verb:"got ready",noun:"getting ready",
  ind:["{S} got ready for {act} without any help.","{S} prepared for {act} independently."],
  prompt:["{S} got ready for {act} with prompts from staff.","With prompting, {s} got ready for {act}."],
  part:["{S} got ready for {act} with some hands-on help from staff.","Staff supported {o} to get ready for {act}."],
  full:["Staff got everything ready for {act}.","Staff prepared for {act} on {p} behalf."],
  declined:["{S} declined {act} at the planning stage.","{S} did not want to go ahead with {act} and this was respected."]},

 {id:"travel",label:"Travelling there",nf:"Daily note",phase:"start",
  opts:["by cab","by bus","by train","on foot","in the staff vehicle","by minibus"],
  verb:"travelled {opt}",
  ind:["{S} travelled {opt} independently.","{S} made {p} own way there {opt} without support."],
  prompt:["{S} travelled {opt} with prompting from staff.","Staff travelled {opt} with {o} and gave prompts where needed."],
  part:["{S} travelled {opt} with some support from staff.","Staff supported {o} for part of the journey {opt}."],
  full:["Staff supported {o} throughout the journey {opt}.","{S} travelled {opt} with full support from staff."],
  declined:["{S} declined to travel {opt} today.","{S} chose not to travel {opt}, and this was respected."]},

 {id:"engage",label:"Taking part",nf:"Daily note",verb:"{did}",
  ind:["{S} {did} without any support.","{S} {did} on {p} own.","{S} {did} independently."],
  prompt:["{S} {did} with prompts from staff.","{S} {did} following prompts from staff.","With prompting, {s} {did}."],
  part:["{S} {did} with some support from staff.","{S} did part of {act} {r} and staff supported with the rest."],
  full:["Staff supported {o} throughout {act}.","{S} {vbe} fully supported by staff during {act}."],
  declined:["{S} chose not to take part in {act}.","{S} declined {act}."]},

 {id:"tools",label:"Using equipment",nf:"Daily note",verb:"used the equipment",noun:"using the equipment",
  ind:["{S} used the equipment without supervision.","{S} set up and used the equipment {r}."],
  prompt:["{S} used the equipment after prompts from staff.","Following prompts from staff, {s} used the equipment."],
  part:["{S} used the equipment with some support from staff.","{S} used the equipment, with staff supporting part of the task."],
  full:["Staff operated the equipment.","The equipment was operated by staff."],
  declined:["{S} did not want to use the equipment today.","{S} declined to use the equipment."]},

 {id:"money",label:"Money &amp; paying",nf:"Daily note",verb:"paid",noun:"paying",
  ind:["{S} paid {r}.","{S} handled {p} own money and paid independently."],
  prompt:["{S} paid after a prompt from staff.","Following a prompt, {s} paid {r}."],
  part:["{S} paid with some support from staff.","Staff supported {o} with part of paying."],
  full:["Staff handled the payment.","Payment was made by staff."],
  declined:["{S} did not want to handle money today.","{S} declined to pay."]},

 {id:"tidy",label:"Clearing up afterwards",nf:"Daily note",phase:"end",verb:"cleared up afterwards",noun:"clearing up",
  ind:["{S} cleared up afterwards without support.","{S} tidied away independently."],
  prompt:["{S} cleared up after a prompt from staff.","Following a prompt, {s} tidied away {r}."],
  part:["{S} cleared up with some help from staff.","Staff and {N} cleared up together afterwards."],
  full:["Staff cleared up afterwards.","Clearing up was done by staff."],
  declined:["{S} did not want to clear up today.","{S} declined to help tidy away."]},

 {id:"finish",label:"Finishing &amp; coming home",nf:"Daily note",phase:"end",
  ind:["{S} decided when to finish.","{S} chose when to stop."],
  prompt:["{S} finished after a prompt from staff.","Following a prompt, {s} finished."],
  min:["{S} finished with minimal support from staff.","Minimal support from staff was needed to finish."],
  part:["{S} finished {act} with some support from staff.","Staff supported {o} to finish {act}."],
  full:["Staff brought {act} to a close.","Staff ended {act}."],
  declined:["{S} did not want to finish {act}.","{S} wanted to carry on with {act}."]}
]};

/* minimal hands-on help, said the same way for every task that has a verb */
const MIN_FROM_VERB = ["{S} {verb} with minimal hands-on help from staff.","{S} {verb}, needing only a little hands-on help."];
Object.keys(TASKS).forEach(k => TASKS[k].forEach(t => {
  if(!t.min && t.verb) t.min = MIN_FROM_VERB.map(x => x.replace("{verb}", t.verb));
}));

/* several tasks at the same level, said once - what the person did first */
const GROUPBANK = {
  ind:["{S} {list} without any support.","Without any help, {s} {list}.","{S} {list} independently."],
  prompt:["With prompting, {s} {list}.","{S} {list}, needing only prompts from staff.","{S} {list} with prompts from staff."],
  min:["{S} {list} with minimal hands-on help.","With a little hands-on help from staff, {s} {list}."],
  full:["Staff gave {o} full support with {nouns}.","{S} {vbe} fully supported by staff with {nouns}."],
  declined:["{S} declined {nouns}.","{S} chose not to have support with {nouns}."]
};

/* the overall level, said only when no task row carries a level */
const LEVELBANK = {
  ind:["{S} completed this independently.","No hands-on support was needed.","{S} managed the whole interaction {r}."],
  prompt:["Support was limited to prompting; no hands-on help was needed.","{S} needed prompts only, with no hands-on support."],
  min:["{S} needed minimal hands-on support.","Support was kept to minimal hands-on help."],
  part:["{S} did what {s} could {r} and staff supported with the rest.","Support was shared: {s} did part {r} and staff supported with the rest."],
  full:["Staff provided full hands-on support.","Full hands-on support was given by staff."]
};

/* ---------- opening & communication banks ---------- */
/* An activity offered on its own is not a choice. Saying "a choice of activity"
   or "alongside another option" when one thing was offered puts something in the
   record that did not happen. */
/* Activities come in two shapes and they are not the same record.
   A college course was chosen at enrolment for the term, so nothing is offered
   on the day - what matters is that they went, how the journey was kept safe,
   the support given in the session, and what they gained from it.
   In-house and community activities are genuinely offered and chosen. */
const ACT_SETTING = [["college","College course"],["community","At home or in the community"]];

const COURSES = [
  ["music","Music","{p} music class","attended {p} music class"],
  ["cooking","Cooking","{p} cooking class","attended {p} cooking class"],
  ["baking","Baking","{p} baking class","attended {p} baking class"],
  ["dance","Dance","{p} dance class","attended {p} dance class"],
  ["singing","Singing","{p} singing class","attended {p} singing class"],
  ["exercise","Exercise","{p} exercise class","attended {p} exercise class"],
  ["allotment","Allotment","{p} allotment session","attended {p} allotment session"],
  ["art","Art &amp; painting","{p} art class","attended {p} art class"],
  ["drama","Drama","{p} drama class","attended {p} drama class"],
  ["computing","Computing","{p} computing class","attended {p} computing class"],
  ["literacy","Literacy &amp; numeracy","{p} literacy and numeracy class","attended {p} literacy and numeracy class"],
  ["lifeskills","Life skills","{p} life skills session","attended {p} life skills session"],
  ["othercourse","Another course","{p} class","attended {p} class"]
];

/* a college session is not offered on the day, so the response is about
   readiness to go, not about picking from a menu */
const RESP_COLLEGE = [
  ["keen","Ready and keen to go"], ["agreedgo","Agreed readily"],
  ["encouraged","Needed some encouragement"], ["reluctant","Reluctant but agreed"],
  ["declinedgo","Declined to attend"]
];
const RESP_SCOPE = {
  choseA:"offer", choseB:"offer",
  agreed:"all", nonverbal:"all", delayed:"all", declined:"all", noresp:"all",
  keen:"college", agreedgo:"college", encouraged:"college", reluctant:"college", declinedgo:"college"
};

/* what the person got out of it - the part a course note lives or dies on */
const LEARN = [
  ["skill","Practised a skill they are working on"], ["instructions","Followed the tutor's instructions"],
  ["alongside","Worked alongside others"], ["conversation","Talked with peers or staff"],
  ["turn","Waited their turn or shared"], ["askedhelp","Asked for help when needed"],
  ["safe","Used tools or equipment safely"], ["finished","Finished a piece of work"],
  ["pride","Showed pride in what they did"], ["change","Managed a change of plan"]
];
const LEARNBANK = {
  skill:["{S} practised the skill {s} {vhave} been working on.",
         "{S} worked on a skill {s} {vhave} been building."],
  instructions:["{S} followed the tutor's instructions.",
                "{S} listened to the tutor and followed the instructions given."],
  alongside:["{S} worked alongside others.",
             "{S} shared the space and the work with others."],
  conversation:["{S} talked with others during the session.",
                "{S} joined in conversation with others."],
  turn:["{S} waited {p} turn and shared with others.",
        "{S} took turns with the others."],
  askedhelp:["{S} asked for help when {s} needed it.",
             "{S} let staff know when {s} needed help."],
  safe:["{S} used tools and equipment safely.",
        "{S} handled the equipment safely."],
  finished:["{S} finished a piece of work.",
            "{S} completed a piece of work."],
  pride:["{S} showed pride in what {s} had done.",
         "{S} {vbe} visibly pleased with {p} work."],
  change:["{S} managed a change of plan.",
          "{S} coped with a change to the usual plan."]
};
/* safeguarding on the journey belongs with the journey, not after the class */
const TRAVEL_RISK = ["seatbelt","doortodoor","stop","fare","crossing","road"];

/* where each safety choice makes sense: "out" in the community, "all"
   anywhere, or only with the kind of journey it belongs to */
const RISK_SCOPE = { sight:"out", road:"out", toilet:"out", accessible:"out", space:"all", plan:"all",
                     seatbelt:"vehicle", doortodoor:"out", stop:"stop", fare:"fare", crossing:"out" };
const JOURNEY = { vehicle:["by cab","in the staff vehicle","by minibus"], stop:["by bus","by train"], fare:["by bus","by train","by cab"] };

/* Every opener carries {time} (as "At {time}, " or " at {time}", so it can be
   lifted out cleanly when no time was recorded) and {ratio}, so rewording can
   never drop either fact. */
const OPEN_COLLEGE = [
  "{N} attended {act} at college at {time}{ratio}.",
  "At {time}, {N} attended {act} at college{ratio}.",
  "{N} went to college at {time} for {act}{ratio}.",
  "{N} attended college at {time} for {act}{ratio}."
];
/* a college session they did not go to must not open with "attended" */
const OPEN_COLLEGE_DECLINED = [
  "{N} was due to attend {act} at college at {time}{ratio}.",
  "At {time}, {N} was due at college for {act}{ratio}."
];
const OPEN_ACT = {
 choice:[
  "{N} was offered a choice of activity at {time}{ratio}.",
  "At {time}, staff offered {N} a choice of what to do{ratio}.",
  "{N} was offered two options at {time}{ratio}."],
 single:[
  "{N} was offered {offer} at {time}{ratio}.",
  "At {time}, staff offered {N} {offer}{ratio}.",
  "{Offer} was offered to {N} at {time}{ratio}."]
};
/* personal care reads differently at 07:00 and at 22:00 */
const OPEN_PC = {
 pm:[
  "{N} was offered support with {p} evening personal care at {time}{ratio}.",
  "At {time}, staff offered {N} support with {p} evening personal care{ratio}.",
  "Evening personal care was offered to {N} at {time}{ratio}."],
 night:[
  "{N} was offered support with {p} night routine at {time}{ratio}.",
  "At {time}, staff offered {N} support to get ready for bed{ratio}.",
  "Support with {p} night routine was offered to {N} at {time}{ratio}.",
  "{N} was approached at {time} and offered support with {p} night-time routine{ratio}."],
 continence:[
  "{N} was offered continence support at {time}{ratio}.",
  "At {time}, staff offered {N} support with {p} personal hygiene{ratio}.",
  "Continence support was offered to {N} at {time}{ratio}."]
};
const OPEN = {
personal:[
 "{N} was offered support with {p} personal care at {time}{ratio}.",
 "At {time}, staff offered {N} support with {p} personal care{ratio}.",
 "Support with personal care was offered to {N} at {time}{ratio}.",
 "{N} was approached at {time} and offered support with {p} personal care{ratio}."],
eating:[
 "{N} was offered {meal} at {time}{ratio}.",
 "At {time}, staff offered {N} {meal}{ratio}.",
 "{meal2} was offered to {N} at {time}{ratio}."]
};

/* what was offered, when it is not already named by the opener */
const OFFERBANK = {
 two:["{S} {vbe} offered a choice of {offerA} or {offerB}.","Staff offered {o} a choice of {offerA} or {offerB}.","The options offered were {offerA} or {offerB}."],
 one:["{S} {vbe} offered {offerA}.","Staff offered {o} {offerA}."]
};

/* a college session with both times recorded - the times as entered, and
   no duration worked out from them, so no number appears that staff did not type */
const SESSIONBANK = [
  "{S} {vbe} at college from {time} until {sessionTo}.",
  "The session ran from {time} to {sessionTo}.",
  "The class ran from {time} until {sessionTo}."
];

/* food and drink, built only from what was entered */
const INTAKEBANK = {
 ateWhat:["{P} meal was {whatAte}; {s} ate {ate} of it.","{S} had {whatAte} and ate {ate} of it."],
 ate:["{S} ate {ate} of {p} meal.","{S} ate {ate} of what was served."],
 what:["{S} had {whatAte}.","{P} meal was {whatAte}."],
 offeredDrunk:["{S} {vbe} offered {offered}ml{ofDrink} and drank {drunk}ml.","{S} drank {drunk}ml of the {offered}ml{ofDrink} offered."],
 drunk:["{S} drank {drunk}ml{ofDrink}.","{S} had {drunk}ml{ofDrink} to drink."],
 drink:["{S} chose {drink} to drink.","{S} picked {drink} as {p} drink."]
};
const COMMBANK = {
 verbal:["Staff used short, clear sentences.","Staff spoke in short, simple sentences.","Staff kept the language short and clear."],
 makaton:["Staff used Makaton signing.","Makaton signs were used by staff.","Staff signed in Makaton."],
 pictures:["Staff used {p} picture-based communication book.","Pictures were used to communicate with {o}.","Staff showed {o} pictures from {p} communication book."],
 nownext:["Staff used a Now and Next board.","A Now and Next board was used with {o}.","Staff set out what was happening on a Now and Next board."],
 objects:["Staff used objects of reference.","Objects of reference were used with {o}."],
 gesture:["Staff watched {p} body language and responded to the cues {s} gave.","Staff read {p} gestures and expressions."]
};
const RESPBANK = {
 choseA:["{S} chose {chosen}.","{S} indicated {chosen}.","{S} picked {chosen}."],
 choseB:["{S} chose {chosen}.","{S} went for {chosen}.","{S} selected {chosen}."],
 agreed:["{S} agreed to what was offered.","{S} agreed to go ahead.","{S} accepted the offer."],
 nonverbal:["{S} gave a clear non-verbal response.","{S} made {p} preference clear without words.","{S} showed {p} choice non-verbally."],
 delayed:["{S} declined at first. {declined} {S} then agreed.","{S} said no to begin with. {declined} {S} then agreed."],
 declined:["{S} declined. {declined}","{S} did not want to go ahead. {declined}"],
 keen:["{S} {vbe} ready and keen to go.","{S} {vbe} keen to go and ready to leave."],
 agreedgo:["{S} agreed readily to go.","{S} readily agreed to attend."],
 encouraged:["{S} needed some encouragement before agreeing to go.","{S} agreed to go after some encouragement from staff."],
 reluctant:["{S} {vbe} reluctant at first. {declined} {S} then agreed to attend.","{S} did not want to go to begin with. {declined} {S} then agreed to go."],
 declinedgo:["{S} declined to attend today. {declined}","{S} chose not to go to college today. {declined}"],
 noresp:["{S} did not give a clear response.","No clear response was given."]
};
const HOWBANK = {
 said:["{S} told staff what {s} wanted.","{S} said so in {p} own words."],
 pointed:["{S} pointed to {p} choice.","{S} made {p} choice by pointing."],
 signed:["{S} signed {p} choice.","{S} signed to show what {s} wanted."],
 nodded:["{S} nodded to show {p} choice.","{S} nodded to let staff know."],
 led:["{S} led staff to what {s} wanted.","{S} took staff to {p} choice."],
 reached:["{S} reached for the option {s} wanted.","{S} reached out towards {p} choice."],
 facial:["{P} facial expression made {p} preference clear.","{S} showed {p} preference through {p} facial expression."]
};
/* the same, as a clause, so a choice and how it was shown can be one sentence */
const HOW_JOIN = {
 said:"telling staff in {p} own words", pointed:"pointing to {p} choice", signed:"signing {p} choice",
 nodded:"nodding to show {p} choice", led:"leading staff to it", reached:"reaching for it",
 facial:"showing it through {p} facial expression"
};
const CONSENTBANK = {
 yes:["Consent was obtained before any support began.","{S} gave consent before support started.","Consent was checked and given before staff began."],
 implied:["Consent was implied through {p} cooperation.","{S} cooperated, and consent was implied by {p} response."],
 no:["Consent was not given.","{S} did not give consent."]
};
/* what was done about a new mark belongs to the follow-up the staff member
   ticks - body map, handover - never to this sentence */
const SKINBANK = {
 clear:["{P} skin was observed during care and no new redness, bruising, scratches or broken areas were seen.",
        "Staff observed {p} skin during care and saw no new concerns.",
        "{P} skin was checked during personal care and no new concerns were seen."],
 concern:["A new mark was seen during care &mdash; {skinDetail}.",
          "During care staff noticed {skinDetail}.",
          "Staff observed {skinDetail} during care."]
};

const MOODBANK = {
 settled:["{S} remained settled throughout.","{S} {vbe} calm and settled."],
 cheerful:["{S} {vbe} cheerful.","{S} seemed in good spirits."],
 quiet:["{S} {vbe} quiet.","{S} {vbe} quiet during the interaction."],
 chatty:["{S} chatted with staff.","{S} {vbe} talkative."],
 tired:["{S} appeared tired.","{S} seemed tired."],
 anxious:["{S} appeared anxious.","{S} showed signs of anxiety."],
 unsettled:["{S} {vbe} unsettled at points.","{S} appeared unsettled."]
};
const WELLBANK = {
 nochange:["No change from {p} usual presentation, appetite or energy was observed.",
           "Nothing was different from {p} usual self.",
           "{S} presented as usual with no change in appetite, energy or mood."],
 appetite:["{P} appetite was different from usual today.","A change in {p} usual appetite was noticed today."],
 pain:["{S} showed signs of discomfort during the interaction.","Signs of discomfort were observed during the interaction."],
 cough:["{S} coughed during the interaction.","Coughing was observed during the interaction."],
 sleep:["{S} had slept poorly.","{S} slept poorly."]
};

/* Context-aware observation sets. Each is shown only where it applies, and
   each choice has exactly the sentence it produces - nothing more. */
const DIGNITY = [["knocked","Knocked and waited before entering"],["door","Closed the door for privacy"],
                 ["covered","Kept them covered where possible"],["explained","Explained each step before doing it"]];
const DIGNITYBANK = {
 knocked:["Staff knocked and waited before entering.","Staff knocked and waited for a response before going in."],
 door:["Staff closed the door to maintain {p} privacy.","The door was closed for {p} privacy."],
 covered:["Staff kept {o} covered where possible.","{S} {vbe} kept covered where possible."],
 explained:["Staff explained each step before doing it.","Each step was explained to {o} before it happened."]
};

const CONT_OBS = [["urine","Passed urine"],["bowels","Bowels opened"],["dry","Dry when checked"],["episode","Incontinence episode"]];
const CONTBANK = {
 urine:["{S} passed urine.","{S} passed urine during the support."],
 bowels:["{S} opened {p} bowels.","{P} bowels were opened."],
 dry:["{S} {vbe} dry when checked.","{S} {vbe} found to be dry."],
 episode:["{S} had an episode of incontinence.","An episode of incontinence occurred."]
};

const SLEEP_OBS = [["asleep","Asleep when checked"],["awakesettled","Awake and settled"],["awakeunsettled","Awake and unsettled"]];
const SLEEPBANK = {
 asleep:["{S} {vbe} asleep when checked.","{S} {vbe} asleep at the check."],
 awakesettled:["{S} {vbe} awake and settled when checked.","{S} {vbe} awake but settled."],
 awakeunsettled:["{S} {vbe} awake and unsettled when checked.","{S} {vbe} awake and appeared unsettled."]
};

/* observable behaviour - what staff are asked for instead of "difficult" */
const BEHAVIOUR = [["raised","Raised voice"],["movedaway","Moved away from staff"],["declinedact","Declined the activity"],
                   ["pushed","Pushed an item away"],["askedleave","Repeatedly asked to leave"],["smiled","Smiled or laughed"],
                   ["other","Other \u2014 describe"]];
const BEHAVIOURBANK = {
 raised:["{S} raised {p} voice.","{S} spoke with a raised voice."],
 movedaway:["{S} moved away from staff.","{S} moved away from the staff member."],
 declinedact:["{S} declined the activity.","{S} said no to the activity."],
 pushed:["{S} pushed an item away.","{S} pushed an item away from {r}."],
 askedleave:["{S} asked to leave several times.","{S} repeatedly asked to leave."],
 smiled:["{S} smiled and laughed.","{S} {vbe} seen smiling and laughing."]
};

/* what was done about it - each one appears only when it was actually done */
const FOLLOWUP = [["handover","Handed over to the next shift"],["senior","Senior or manager informed"],
                  ["health","Health professional contacted"],["family","Family or representative informed"],
                  ["bodymap","Body map completed"],["mar","MAR chart signed"],["incident","Incident form completed"]];
const FOLLOWBANK = {
 handover:["This was handed over to the next shift.","Staff handed this over to the next shift."],
 senior:["A senior colleague or manager was informed.","Staff informed a senior colleague or manager."],
 health:["A health professional was contacted.","Staff contacted a health professional."],
 family:["{P} family or representative was informed.","Staff informed {p} family or representative."],
 bodymap:["A body map was completed.","Staff completed a body map."],
 mar:["The MAR chart was signed.","Staff signed the MAR chart."],
 incident:["An incident form was completed.","Staff completed an incident form."]
};

/* Phrases in a staff member's own words that mean the same as a tick option,
   so the app can suggest the tick (and not say the same thing twice once it is
   ticked). Regular-expression fragments, matched case-insensitively within one
   sentence. Kept conservative: a missed suggestion costs nothing, a wrong one
   annoys. A sentence with a negation in it never matches anything. */
const MATCH = {
 /* what they did during an activity */
 "food-hands":["wash(?:ed|ing)? (?:his|her|their) hands","hand ?wash"], "food-ingredients":["(?:chose|picked(?: out)?) (?:the )?ingredients"],
 "food-recipe":["recipe"], "food-hob":["\\bhob\\b","\\boven\\b"], "food-served":["served (?:up )?(?:the )?(?:food|meal|dinner|lunch)","dished up"],
 "food-tasted":["tasted"], "music-chose":["(?:chose|picked) (?:the |a )?(?:song|music|track)"], "music-sang":["\\bsang\\b","singing","karaoke"],
 "music-instrument":["drum","guitar","keyboard","piano","tambourine","instrument","shaker"], "music-danced":["danc(?:e|ed|ing)"],
 "music-listened":["kept time","clapp(?:ed|ing) along"], "arts-materials":["(?:chose|picked) (?:the )?(?:paint|colour|material|paper)"],
 "arts-made":["own design","made (?:a|his|her|their) own"], "arts-showed":["showed (?:his|her|their) (?:work|painting|picture|drawing)"],
 "physical-warmup":["warm[- ]?up"], "physical-pace":["own pace"], "physical-rest":["took a (?:rest|break)","sat down to rest","rested"],
 "water-changed":["got changed","changed into (?:his|her|their) (?:swim|trunks|costume)"], "water-swam":["\\bswam\\b","swimming","in the water","\\blengths?\\b"],
 "walking-route":["(?:chose|picked) (?:the|which) (?:route|way)","which way to go"], "walking-stopped":["stopped to look","looked at the"],
 "shopping-list":["shopping list","\\blist\\b"], "shopping-items":["(?:chose|picked(?: out)?) (?:the |what |which )?(?:items|things)"],
 "shopping-bags":["carried (?:the )?(?:bags|shopping)","\\bbags?\\b"], "garden-planted":["plant(?:ed|ing)","water(?:ed|ing) the","seeds"],
 "garden-tools":["trowel","spade","rake","secateurs","garden tools"], "laundry-sorted":["sorted (?:the )?(?:washing|laundry|clothes)"],
 "laundry-machine":["machine"], "laundry-folded":["folded"], "chores-room":["(?:his|her|their) (?:own )?room"], "chores-hoover":["hoover","vacuum","dust(?:ed|ing)"],
 /* skills and social */
 skill:["practi[sc]ed","working on"], instructions:["followed (?:the )?(?:tutor|instructions|directions)","listened to the tutor"],
 alongside:["alongside","with (?:the )?others","with other (?:learners|attendees|people|residents|students|members)"],
 conversation:["chatted","talked (?:with|to)","conversation","spoke (?:with|to)"], turn:["took turns","waited (?:his|her|their) turn","\\bshared\\b"],
 askedhelp:["asked for help","asked (?:staff|the tutor) (?:for|to)"], safe:["safely"],
 finished:["(?:finished|completed) (?:a|the|his|her|their) (?:piece|work|painting|model|project|card|picture)"], pride:["proud","pleased with"],
 change:["change of plan","plan changed","ran differently"],
 /* privacy and dignity */
 knocked:["knocked"], door:["closed the door","door (?:was )?(?:closed|shut)","shut the door"], covered:["kept (?:him|her|them) covered","towel over"],
 explained:["explained (?:each|every|the) step","talked (?:him|her|them) through"],
 /* keeping them safe */
 sight:["within sight","in sight","line of sight"], road:["traffic side","roadside"], toilet:["toilet before"], accessible:["accessible toilet","disabled toilet"],
 space:["path clear","walking path"], plan:["(?:explained|went through|talked through) the plan"], seatbelt:["seat ?belt"], doortodoor:["door to door"],
 stop:["at the (?:bus )?stop"], fare:["\\bfare\\b","ticket"], crossing:["crossing","crossed the road"],
 /* how they presented and wellbeing */
 settled:["\\bsettled\\b","\\bcalm\\b"], cheerful:["cheerful","good spirits","\\bhappy\\b","good mood"], quiet:["\\bquiet\\b"],
 chatty:["chatty","talkative"], tired:["\\btired\\b","sleepy","yawn"], anxious:["anxious","worried","nervous"],
 unsettled:["unsettled","agitated","distressed","\\bupset\\b"],
 appetite:["appetite"], pain:["\\bpain\\b","discomfort","\\bsore\\b","winc(?:ed|ing)","hurting"], cough:["cough"],
 sleep:["slept (?:poorly|badly)","didn'?t sleep","did not sleep","up in the night"],
 /* behaviour, described */
 raised:["raised (?:his|her|their) voice","shout","loud voice"], movedaway:["moved away","walked away","left the room"],
 pushed:["pushed (?:it|the|his|her|their|them|away)"], askedleave:["asked to leave","wanted to leave","asked to go"], smiled:["smil","laugh"],
 /* what was done about it */
 handover:["handed over","hand over","handover"], senior:["manager","\\bsenior\\b","team leader"],
 health:["\\bgp\\b","\\bnurse\\b","doctor","\\b111\\b","paramedic","ambulance","pharmac"],
 family:["family","\\bmum\\b","\\bdad\\b","mother","father","brother","sister","next of kin","advocate"],
 bodymap:["body map"], mar:["\\bmar\\b","mar chart"], incident:["incident (?:form|report)","datix"],
 /* continence and sleep */
 urine:["passed urine","\\bwee\\b","urinated","pass(?:ed)? water"], bowels:["bowels","\\bstool\\b"], dry:["\\b(?:was|were) dry\\b"],
 episode:["incontinen","\\bwet (?:the|his|her|their|himself|herself|themselves)","soiled"],
 asleep:["asleep","sleeping"], awakesettled:["awake (?:and|but) settled"], awakeunsettled:["awake and (?:unsettled|upset|agitated|distressed)"]
};

/* how staff communicated this time; the profile only says which are usual */
const STAFFING = [["","Not stated"],["1:1","1:1"],["2:1","2:1"],["shared","Shared staffing"]];

const RISKBANK = {
 sight:["Staff remained within sight of {o} throughout.","{S} stayed within staff sight throughout."],
 road:["Near roads, staff walked on the traffic side.","Staff walked on the traffic side near roads."],
 toilet:["{S} used the toilet before leaving.","{S} went to the toilet before going out."],
 accessible:["Staff found an accessible toilet.","An accessible toilet was located by staff."],
 space:["Staff kept {p} walking path clear.","{P} walking path was kept clear."],
 plan:["The plan was explained to {o} in advance.","Staff explained the plan to {o} beforehand."],
 seatbelt:["{S} wore a seatbelt for the journey.","{S} wore {p} seatbelt for the journey."],
 doortodoor:["Staff escorted {o} door to door.","{S} {vbe} escorted door to door."],
 stop:["Staff waited with {o} at the stop.","Staff and {N} waited together at the stop."],
 fare:["Staff held the fare or ticket for {o}.","Staff held {p} fare or ticket."],
 crossing:["Staff supported {o} at crossings.","{S} {vbe} supported by staff at crossings."]
};
const OUTBANK = {
 ready:["{N} was clean, comfortable and ready for the day.",
        "{S} {vbe} clean, comfortable and ready for the day.",
        "{N} finished clean, comfortable and ready to start {p} day."],
 settled:["{S} {vbe} settled afterwards.",
          "{S} remained settled once the interaction had finished.",
          "{S} {vbe} calm and settled at the end."],
 enjoyed:["{S} enjoyed it and would do it again.",
          "{S} showed {s} had enjoyed it and would like to do it again.",
          "{S} had enjoyed it and would do it again."],
 proud:["{S} seemed pleased with what {s} had done.",
        "{S} looked pleased with {r} afterwards."],
 home:["{S} returned home safely and settled.",
       "{S} got home safely and settled."],
 later:["Support was left for now and will be offered again later.",
        "This will be offered again later."],
 nightsettled:["{N} was settled in bed and comfortable.",
        "{S} {vbe} settled in bed and appeared comfortable.",
        "{S} got into bed and settled."],
 slept:["{S} settled and {vbe} asleep at the next check.",
        "{S} {vbe} asleep at the next check."],
 resettled:["{S} resettled without distress.",
        "{S} settled again without distress."],
 nochangeout:["The interaction finished with no concerns and {p} usual routine continued.",
              "There were no concerns and {s} carried on with {p} usual routine."]
};
/* an outcome that can take "Afterwards, " in front without saying it twice */
const OUT_LEAD = ["", "Afterwards, ", "By the end, "];
const MEALWORD = {breakfast:["breakfast","Breakfast"],lunch:["lunch","Lunch"],dinner:["{p} evening meal","The evening meal"],
                  snack:["a snack","A snack"],fluids:["a drink","A drink"]};

const DAYS = [["1","Monday"],["2","Tuesday"],["3","Wednesday"],["4","Thursday"],
              ["5","Friday"],["6","Saturday"],["0","Sunday"]];

G.data = {
  COMM, FLAGS, RESP, HOW, CONSENT, SKIN, MOOD, WELL, RISK, OUTCOME, ACTS, ACT_INFO, OVERALL_LEVELS, OUT_SCOPE, SLOTS, LEVELS, TASKS, ACT_SETTING, COURSES, RESP_COLLEGE, RESP_SCOPE, LEARN, LEARNBANK, TRAVEL_RISK, OPEN_COLLEGE, OPEN_ACT, OPEN_PC, OPEN, COMMBANK, RESPBANK, HOWBANK, CONSENTBANK, SKINBANK, MOODBANK, WELLBANK, RISKBANK, OUTBANK, MEALWORD, DAYS, OUT_LEAD,
  GROUPBANK, LEVELBANK, OFFERBANK, SESSIONBANK, INTAKEBANK, HOW_JOIN, OPEN_COLLEGE_DECLINED,
  DIGNITY, DIGNITYBANK, CONT_OBS, CONTBANK, SLEEP_OBS, SLEEPBANK, BEHAVIOUR, BEHAVIOURBANK, FOLLOWUP, FOLLOWBANK,
  STAFFING, RISK_SCOPE, JOURNEY, DURING, DURINGBANK, MATCH
};
})(globalThis.GSN = globalThis.GSN || {});
