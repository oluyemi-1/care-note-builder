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
  ["nochangeout","No concerns; usual routine resumed"],
  ["calmagain","Settled and back to their usual routine"],
  ["monitored","Being monitored (say how often in the handover)"],
  ["hospital","Taken to hospital"]
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
  ["connect","Connect &amp; communication","{p} Connect and Communication session","took part in {p} Connect and Communication session"],
  ["pop","Playing Pop","{p} Playing Pop session","took part in {p} Playing Pop session"],
  ["tabletennis","Table tennis","table tennis","played table tennis"],
  ["gateway","Gateway Club","Gateway Club","went to Gateway Club"],
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
  settled:      {kinds:["personal","eating","activity","medication","abc","incident"]},
  calmagain:    {kinds:["abc","incident"]},
  monitored:    {kinds:["abc","incident"]},
  hospital:     {kinds:["incident"]},
  enjoyed:      {kinds:["eating","activity"]},
  proud:        {kinds:["eating","activity"]},
  home:         {kinds:["activity"]},
  nightsettled: {kinds:["personal"], slots:["pm","night"]},
  slept:        {kinds:["personal"], slots:["pm","night"]},
  resettled:    {kinds:["personal"], slots:["pm","night"]},
  later:        {kinds:["personal","eating","activity","medication"]},
  nochangeout:  {kinds:["personal","eating","activity","medication","abc","incident"]}
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
  film:{where:"home"}, exercise:{where:"either", tags:["physical"]}, appt:{where:"out"}, connect:{where:"either", tags:["communication"]},
  family:{where:"either"}, drive:{where:"out", tags:["transport"]}, other:{where:"either"},
  pop:{where:"either", tags:["music"]}, tabletennis:{where:"either", tags:["physical"]}, gateway:{where:"out", tags:["social"]},
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
DURING.social = [["social-friends","Met up with friends"],["social-joined","Joined in the group activity"],
                 ["social-new","Spoke to someone new"],["social-snack","Bought a drink or snack"]];
DURING.communication = [["comm-greeted","Greeted others"],["comm-turns","Took turns in a conversation"],
                        ["comm-aid","Used their communication aid"],["comm-symbols","Made a choice using pictures or symbols"],
                        ["comm-listened","Listened while others spoke"],["comm-newsign","Practised a new word or sign"],
                        ["comm-initiated","Started a conversation themselves"]];
const DURINGBANK = {
 "food-hands":["{S} washed {p} hands before handling food.","Before handling food, {s} washed {p} hands.","Before touching the food, {s} washed {p} hands."],
 "food-ingredients":["{S} chose the ingredients.","{S} picked out the ingredients.","{S} selected the ingredients."],
 "food-recipe":["{S} followed the recipe.","{S} worked through the recipe.","{S} followed the steps of the recipe."],
 "food-hob":["{S} used the hob or oven safely.","{S} used the hob or oven without incident.","{S} safely used the hob or oven."],
 "food-served":["{S} served the food.","{S} served up the food.","{S} dished up the food."],
 "food-tasted":["{S} tasted what {s} had made.","{S} tried what {s} had made.","{S} had a taste of what {s} had made."],
 "music-chose":["{S} chose the music.","{S} picked the music.","{S} selected the music."],
 "music-sang":["{S} sang along.","{S} joined in with the singing.","{S} joined in and sang along."],
 "music-instrument":["{S} played an instrument.","{S} played along on an instrument.","{S} joined in by playing an instrument."],
 "music-danced":["{S} danced.","{S} danced to the music.","{S} had a dance."],
 "music-listened":["{S} listened and kept time with the music.","{S} kept time with the music.","{S} listened to the music and kept time with it."],
 "arts-materials":["{S} chose the materials.","{S} picked out the materials {s} wanted to use.","{S} selected the materials."],
 "arts-made":["{S} made something of {p} own design.","{S} made a piece of {p} own design.","{S} created something of {p} own design."],
 "arts-showed":["{S} showed {p} work to others.","{S} showed others what {s} had made.","{S} shared {p} work with others."],
 "physical-warmup":["{S} joined in the warm-up.","{S} took part in the warm-up.","{S} did the warm-up."],
 "physical-pace":["{S} set {p} own pace.","{S} went at {p} own pace.","{S} decided on {p} own pace."],
 "physical-rest":["{S} took a rest when {s} needed one.","{S} rested when {s} needed to.","{S} had a rest when {s} needed one."],
 "water-changed":["{S} got changed for the water.","{S} changed into {p} swimwear.","{S} changed ready for the water."],
 "water-swam":["{S} swam and moved about in the water.","{S} moved about in the water.","{S} moved around in the water."],
 "walking-route":["{S} chose the route.","{S} decided which way to go.","{S} picked the route."],
 "walking-stopped":["{S} stopped to look at things on the way.","{S} took time to look at things along the way.","{S} paused on the way to look at things."],
 "shopping-list":["{S} used a shopping list.","{S} worked from a shopping list.","{S} used a list for the shopping."],
 "shopping-items":["{S} chose the items.","{S} picked the items {s} wanted.","{S} selected the items."],
 "shopping-bags":["{S} carried the bags.","{S} carried the shopping.","{S} carried the shopping bags."],
 "garden-planted":["{S} planted and watered.","{S} did some planting and watering.","{S} planted things and watered them."],
 "garden-tools":["{S} used garden tools.","{S} worked with garden tools.","{S} used tools in the garden."],
 "laundry-sorted":["{S} sorted the washing.","{S} sorted the washing into loads.","{S} sorted out the washing."],
 "laundry-machine":["{S} loaded and started the machine.","{S} loaded the machine and started it.","{S} put the washing in the machine and started it."],
 "laundry-folded":["{S} folded the clean washing.","{S} folded the washing once it was dry.","{S} folded up the clean washing."],
 "chores-room":["{S} tidied {p} own room.","{S} tidied {p} room.","{S} tidied up {p} room."],
 "social-friends":["{S} met up with {p} friends.","{S} spent time with {p} friends there.","{S} got together with {p} friends."],
 "social-joined":["{S} joined in the group activity.","{S} took part in what the group was doing.","{S} joined in with the group."],
 "social-new":["{S} spoke to someone new.","{S} talked to someone {s} had not met before.","{S} had a conversation with someone new."],
 "social-snack":["{S} bought {r} a drink or snack.","{S} chose and bought a drink or snack.","{S} bought a drink or snack for {r}."],
 "comm-greeted":["{S} greeted the others.","{S} said hello to the others.","{S} greeted the other people there."],
 "comm-turns":["{S} took turns in a conversation.","{S} waited for {p} turn to speak and took it.","{S} took turns to speak in a conversation."],
 "comm-aid":["{S} used {p} communication aid.","{S} communicated using {p} aid.","{S} made use of {p} communication aid."],
 "comm-symbols":["{S} made a choice using pictures or symbols.","{S} chose using pictures or symbols.","{S} used pictures or symbols to make a choice."],
 "comm-listened":["{S} listened while others spoke.","{S} listened to the others.","{S} listened while the others were speaking."],
 "comm-newsign":["{S} practised a new word or sign.","{S} tried out a new word or sign.","{S} had a go at a new word or sign."],
 "comm-initiated":["{S} started a conversation {r}.","{S} began a conversation without being prompted.","{S} started a conversation of {p} own accord."],
 "chores-hoover":["{S} hoovered and dusted.","{S} did the hoovering and dusting.","{S} did some hoovering and dusting."]
};

/* the overall level in step 3, most to least independent */
const OVERALL_LEVELS = [["ind","Fully independent"],["prompt","Prompting only"],["min","Minimal hands-on support"],
                        ["part","Part hands-on support"],["full","Full hands-on support"]];

const SLOTS = {
  personal:[["am","Personal Care &mdash; AM"],["pm","Personal Care &mdash; PM"],["night","Personal Care &mdash; Night"],["continence","Continence support"]],
  eating:[["breakfast","Breakfast"],["lunch","Lunch"],["dinner","Dinner"],["snack","Snack"],["fluids","Daily Fluid Intake"]],
  activity: ACTS.map(a => [a[0], a[1]]),
  medication:[["morning","Morning medication"],["lunchtime","Lunchtime medication"],["teatime","Teatime medication"],
              ["night","Night medication"],["prn","PRN (when required) medication"]],
  abc:[["verbal","Verbal (shouting, swearing)"],["physical","Physical towards others"],["selfinjury","Self-injury"],
       ["property","Damage to property"],["smearing","Smearing (faeces)"],["withdrawal","Withdrawal or refusing interaction"],["refusal","Refusing care or medication"],
       ["leaving","Trying to leave or leaving the building"],["distress","Distress (crying, agitation)"],["otherbeh","Other"]],
  incident:[["fall","Fall"],["injury","Injury"],["mederror","Medication error"],["behaviour","Behaviour towards others"],
            ["choking","Choking"],["missing","Missing person"],["propertydamage","Property damage"],["safeguarding","Safeguarding concern"],
            ["allegation","Allegation"],["environment","Environmental (fire, flood, equipment)"],["otherinc","Other"]]
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
  declined:["{S} declined {opt} on this occasion.","{S} did not want {opt} and this was respected.","{S} chose not to have {opt} this time, and staff respected this."]},

 {id:"hair",label:"Hair washing",nf:"Hair Washing",verb:"washed {p} hair",noun:"washing {p} hair",
  ind:["{S} washed {p} own hair.","{S} washed {p} hair without help.","{S} took care of washing {p} hair independently."],
  prompt:["{S} washed {p} hair after a prompt from staff.","{S} washed {p} hair {r} once staff prompted {o}.","Once prompted by staff, {s} washed {p} hair."],
  part:["{S} washed {p} hair with some hands-on help from staff.","{S} did part of washing {p} hair and staff supported with the rest.","Staff gave some hands-on help while {s} washed {p} hair."],
  full:["Staff washed {p} hair.","Staff washed {p} hair for {o}.","{P} hair was washed by staff."],
  declined:["{S} declined to have {p} hair washed today.","{S} chose not to wash {p} hair and this was respected.","{S} did not want {p} hair washed this time, and staff respected this."]},

 {id:"shave",label:"Shaving",nf:"Shaving",verb:"shaved",noun:"shaving",
  ind:["{S} shaved {r}.","{S} shaved independently.","{S} managed {p} own shave without support."],
  prompt:["{S} shaved {r} after a prompt from staff.","{S} shaved with prompts from staff.","Once prompted by staff, {s} shaved."],
  part:["{S} shaved part of {p} face and staff finished the rest.","{S} shaved with some hands-on help from staff.","Staff gave some hands-on help while {s} shaved."],
  full:["Staff shaved {o}.","Staff carried out {p} shave.","{S} {vbe} shaved by staff."],
  declined:["{S} declined a shave today.","{S} did not want to shave and this was respected.","{S} chose not to shave this time, and staff respected this."]},

 {id:"oral",label:"Oral care",nf:"Oral Care",opts:["{p} teeth","{p} teeth with an electric toothbrush","{p} dentures"],
  verb:"brushed {opt}",
  ind:["{S} brushed {opt} without any support.","{S} carried out {p} own oral care, brushing {opt}.","{S} brushed {opt} independently."],
  prompt:["{S} brushed {opt} after a prompt.","With prompting, {s} brushed {opt} {r}.","Once prompted, {s} brushed {opt}."],
  part:["{S} started brushing {opt} and staff supported to finish.","{S} brushed {opt} with some hands-on help from staff.","Staff gave some hands-on help while {s} brushed {opt}."],
  full:["Staff carried out oral care for {o}, brushing {opt}.","Staff brushed {opt} for {o}.","{S} {vbe} supported by staff, who brushed {opt}."],
  declined:["{S} declined to have {opt} brushed on this occasion.","{S} did not want support with {opt} and this was respected.","{S} chose not to have {opt} brushed this time, and staff respected this."]},

 {id:"nails",label:"Nail care",nf:"Nail Care",verb:"cared for {p} nails",noun:"nail care",
  ind:["{S} attended to {p} own nails.","{S} cared for {p} nails {r}.","{S} did {p} nail care independently."],
  prompt:["{S} attended to {p} nails after a prompt from staff.","With prompting, {s} cared for {p} nails.","Once prompted by staff, {s} attended to {p} nails."],
  part:["{S} cared for {p} nails with some hands-on help from staff.","{S} did part of {p} nail care and staff supported with the rest.","Staff gave some hands-on help while {s} cared for {p} nails."],
  full:["Staff attended to {p} nails.","Staff carried out {p} nail care.","{P} nails were cared for by staff."],
  declined:["{S} declined nail care today.","{S} did not want {p} nails done and this was respected.","{S} chose not to have nail care this time, and staff respected this."]},

 {id:"creams",label:"Creams",nf:"Creams Applied as per MAR chart",verb:"applied {p} prescribed cream",noun:"{p} prescribed cream",
  ind:["{S} applied {p} prescribed cream {r}.","{S} put on {p} own prescribed cream.","{S} applied {p} prescribed cream independently."],
  prompt:["{S} applied {p} prescribed cream after a prompt from staff.","Following a prompt, {s} applied {p} prescribed cream.","Once prompted by staff, {s} applied {p} prescribed cream."],
  part:["{S} applied {p} prescribed cream to the areas {s} could reach and staff applied the rest.","{S} applied some of {p} prescribed cream and staff supported with the rest.","Staff supported {o} with part of {p} prescribed cream, and {s} applied the rest {r}."],
  full:["Staff applied {p} prescribed cream.","{P} prescribed cream was applied by staff.","{S} had {p} prescribed cream applied by staff."],
  declined:["{S} declined {p} prescribed cream.","{S} did not want {p} prescribed cream on this occasion.","{S} chose not to have {p} prescribed cream this time."]},

 {id:"dress",label:"Dressing &amp; clothing choice",nf:"Choice of clothing made?",verb:"dressed in clothes {s} chose",noun:"dressing",
  ind:["{S} chose {p} own clothes and dressed without help.","{S} picked out {p} clothes and dressed {r}.","{S} made {p} own choice of clothes and got dressed independently."],
  prompt:["{S} chose {p} clothes and dressed {r} with prompts from staff.","{S} selected {p} clothes and dressed following prompts.","With prompting from staff, {s} chose {p} clothes and got dressed."],
  part:["{S} chose {p} clothes and dressed with some hands-on help from staff.","{S} chose {p} clothes and staff supported with part of dressing.","After choosing {p} clothes, {s} got dressed with some hands-on help from staff."],
  full:["Staff dressed {o}.","Staff supported {o} fully with dressing.","{S} {vbe} fully dressed by staff."],
  declined:["{S} declined to change {p} clothes at this point.","{S} kept on the clothes {s} {vbe} wearing.","{S} chose to stay in the clothes {s} {vbe} wearing."]},

 {id:"continence",label:"Continence support",nf:"Continence chart",verb:"used the toilet",noun:"using the toilet",
  ind:["{S} used the toilet independently.","{S} took {r} to the toilet without support.","{S} went to the toilet {r}, without support."],
  prompt:["{S} used the toilet after a prompt from staff.","Following a prompt, {s} used the toilet {r}.","Once prompted by staff, {s} used the toilet."],
  part:["{S} used the toilet with some hands-on help from staff.","Staff supported {o} to use the toilet, and {s} did part of it {r}.","Staff gave some hands-on help while {s} used the toilet."],
  full:["Staff provided full continence support.","Continence support was given by staff.","{S} {vbe} given full continence support by staff."],
  declined:["{S} declined support with the toilet at this time.","{S} did not want continence support and this was respected.","{S} chose not to have support with the toilet this time, and staff respected this."]},

 {id:"hearing",label:"Hearing aids",nf:"Hearing Aid(s)",verb:"put in {p} hearing aids",noun:"{p} hearing aids",
  ind:["{S} put in {p} hearing aids {r}.","{S} fitted {p} own hearing aids.","{S} fitted {p} hearing aids without support."],
  prompt:["{S} put in {p} hearing aids after a prompt.","Following a prompt, {s} fitted {p} hearing aids.","Once prompted, {s} put in {p} hearing aids."],
  part:["Staff helped {o} to fit {p} hearing aids.","{S} fitted {p} hearing aids with some hands-on help.","{S} put in {p} hearing aids with some help from staff."],
  full:["Staff fitted {p} hearing aids.","{P} hearing aids were fitted by staff.","Staff put in {p} hearing aids for {o}."],
  declined:["{S} declined to wear {p} hearing aids today.","{S} chose not to wear {p} hearing aids.","{S} did not want to wear {p} hearing aids this time."]},

 {id:"glasses",label:"Glasses / lenses",nf:"Glasses / Contact Lenses",verb:"put on {p} glasses",noun:"{p} glasses",
  ind:["{S} put on {p} glasses {r}.","{S} put on {p} glasses without help.","{S} put {p} glasses on independently."],
  prompt:["{S} put on {p} glasses after a prompt.","Following a prompt, {s} put on {p} glasses.","Once prompted, {s} put {p} glasses on."],
  part:["{S} put on {p} glasses with some help from staff.","Staff helped {o} to put on {p} glasses.","Staff gave some help while {s} put on {p} glasses."],
  full:["Staff put {p} glasses on for {o}.","Staff fitted {p} glasses for {o}.","{P} glasses were put on by staff."],
  declined:["{S} declined to wear {p} glasses today.","{S} chose not to wear {p} glasses.","{S} did not want to wear {p} glasses this time."]},

 {id:"aids",label:"Assistive aids",nf:"Assistive Aids Checked, Cleaned & Issued",verb:"used {p} assistive aids",noun:"{p} assistive aids",
  ind:["{S} collected and used {p} own equipment.","{S} used {p} assistive aids without support.","{S} managed {p} own equipment independently."],
  prompt:["{S} used {p} equipment after a prompt from staff.","Following a prompt, {s} used {p} assistive aids.","Once prompted by staff, {s} used {p} equipment."],
  part:["{S} used {p} assistive aids with some help from staff.","Staff helped {o} to use {p} equipment.","Staff gave some help while {s} used {p} equipment."],
  full:["Staff checked, cleaned and issued {p} equipment.","{P} assistive aids were checked, cleaned and issued by staff.","Staff checked and cleaned {p} assistive aids, then issued them."],
  declined:["{S} declined to use {p} equipment on this occasion.","{S} chose not to use {p} assistive aids.","{S} did not want to use {p} equipment this time."]},

 {id:"jewellery",label:"Watch &amp; jewellery",nf:"Watch & Jewellery",verb:"put on {p} watch and jewellery",noun:"{p} watch and jewellery",
  ind:["{S} chose and put on {p} own watch and jewellery.","{S} put on the jewellery {s} wanted to wear.","{S} picked out {p} own watch and jewellery and put them on."],
  prompt:["{S} put on {p} watch and jewellery after a prompt.","Following a prompt, {s} put on {p} watch and jewellery.","Once prompted, {s} put on {p} watch and jewellery."],
  part:["{S} chose {p} jewellery and staff helped fasten it.","Staff helped {o} put on the watch and jewellery {s} chose.","{S} chose the jewellery {s} wanted, and staff helped to put it on."],
  full:["Staff put on {p} watch and jewellery for {o}.","Staff fitted {p} watch and jewellery.","{P} watch and jewellery were put on by staff."],
  declined:["{S} chose not to wear jewellery today.","{S} declined {p} watch and jewellery.","{S} did not want to wear {p} watch and jewellery this time."]},

 {id:"nightwear",label:"Night clothes",nf:"Choice of clothing made?",verb:"changed into {p} night clothes",noun:"changing into {p} night clothes",
  ind:["{S} chose {p} night clothes and changed independently.","{S} got changed for bed without any help.","{S} changed into {p} night clothes independently."],
  prompt:["{S} changed into {p} night clothes after a prompt.","With prompting, {s} changed into {p} night clothes.","Once prompted, {s} changed into {p} night clothes."],
  part:["{S} changed into {p} night clothes with some hands-on help from staff.","Staff supported {o} to change into {p} night clothes, and {s} did part of it {r}.","Staff gave some hands-on help while {s} changed into {p} night clothes."],
  full:["Staff supported {o} fully to change into {p} night clothes.","Staff changed {o} into {p} night clothes.","{S} {vbe} changed into {p} night clothes by staff."],
  declined:["{S} preferred to stay in what {s} {vbe} wearing and this was respected.","{S} declined to change for bed.","{S} chose not to change for bed and stayed in what {s} {vbe} wearing."]},

 {id:"reposition",label:"Repositioning",nf:"Repositioning chart",verb:"changed position in bed",noun:"repositioning",
  ind:["{S} repositioned {r} in bed.","{S} changed position {r}.","{S} moved position in bed independently."],
  prompt:["{S} repositioned {r} after a prompt from staff.","Following a prompt, {s} changed position {r}.","Once prompted by staff, {s} repositioned {r}."],
  part:["{S} changed position with some hands-on help from staff.","Staff supported {o} to reposition, and {s} did part of it {r}.","Staff gave some hands-on help while {s} changed position."],
  full:["Staff repositioned {o}.","Staff changed {p} position.","{S} {vbe} repositioned by staff."],
  declined:["{S} did not want to be repositioned and this was respected.","{S} declined repositioning at this time.","{S} chose not to be repositioned this time."]},

 {id:"settle",label:"Settling for the night",nf:"Daily note",verb:"settled for the night",noun:"settling for the night",
  ind:["{S} took {r} to bed when {s} {vbe} ready.","{S} decided when to go to bed and settled independently.","{S} went to bed when {s} chose and settled {r}."],
  prompt:["{S} went to bed after a prompt from staff.","Following a prompt, {s} settled for the night.","Once prompted by staff, {s} went to bed."],
  part:["{S} got into bed with some hands-on help from staff.","Staff supported {o} to get into bed, and {s} did part of it {r}.","Staff gave some hands-on help while {s} got into bed."],
  full:["Staff supported {o} fully to settle into bed.","Staff settled {o} for the night.","{S} {vbe} fully supported by staff to settle into bed."],
  declined:["{S} {vbe} not ready for bed and chose to stay up.","{S} declined to settle at this point.","{S} chose to stay up rather than settle at this point."]},

 {id:"sleepcheck",label:"Night check",nf:"Night checks",
  ind:["{S} needed no support at the night check.","No support was needed at the night check.","At the night check, {s} did not need any support."],
  prompt:["{S} needed only verbal reassurance at the night check.","At the night check, {s} needed verbal reassurance only.","Verbal reassurance was all {s} needed at the night check."],
  min:["{S} needed minimal hands-on support at the night check.","Minimal hands-on support was given at the night check.","At the night check, {s} {vbe} given minimal hands-on support."],
  part:["Staff gave {o} some hands-on support at the night check.","{S} {vbe} given some hands-on support at the night check.","At the night check, staff gave {o} some hands-on support."],
  full:["Staff carried out the night check.","A night check was completed by staff.","The night check was carried out by staff."],
  declined:["{S} asked not to be disturbed at the night check.","{S} declined the night check.","{S} did not want the night check."]},

 {id:"makeup",label:"Make up",nf:"Make Up",verb:"applied {p} make up",noun:"{p} make up",
  ind:["{S} applied {p} own make up.","{S} did {p} make up without support.","{S} put on {p} make up independently."],
  prompt:["{S} applied {p} make up after a prompt.","{S} did {p} make up following a prompt.","Once prompted, {s} applied {p} make up."],
  part:["{S} applied some of {p} make up and staff supported with the rest.","{S} did {p} make up with some help from staff.","Staff gave some help while {s} did {p} make up."],
  full:["Staff applied {p} make up.","Staff did {p} make up for {o}.","{P} make up was applied by staff."],
  declined:["{S} declined make up today.","{S} chose not to wear make up.","{S} did not want to wear make up this time."]}
],

eating:[
 {id:"choose",label:"Choosing the meal",nf:"Choices Offered",verb:"chose {p} meal",noun:"choosing {p} meal",
  ind:["{S} decided what {s} wanted without any help.","{S} chose {p} meal independently.","{S} made {p} own choice of meal without support."],
  prompt:["{S} chose {p} meal after prompting from staff.","With prompting, {s} made {p} choice of meal.","Once prompted by staff, {s} chose {p} meal."],
  part:["{S} chose {p} meal with some support from staff.","Staff supported {o} to choose {p} meal.","{S} made {p} choice of meal with some support from staff."],
  full:["Staff made the choice of meal on {p} behalf.","The meal was chosen by staff on {p} behalf.","Staff chose the meal for {o}."],
  declined:["{S} did not want to choose a meal at this point.","{S} declined to choose a meal.","{S} chose not to pick a meal this time."]},

 {id:"prep",label:"Preparing the meal",nf:"Daily note",verb:"prepared the meal",noun:"preparing the meal",
  ind:["{S} prepared the meal {r}.","{S} made the meal independently.","{S} prepared the meal without support."],
  prompt:["{S} prepared the meal with prompts from staff.","{S} made the meal following prompts from staff.","With prompting from staff, {s} prepared the meal."],
  part:["{S} prepared part of the meal and staff supported with the rest.","{S} prepared the meal with some hands-on help from staff.","Staff gave some hands-on help while {s} prepared the meal."],
  full:["Staff prepared the meal.","The meal was prepared by staff.","Staff made the meal."],
  declined:["{S} did not want to help prepare the meal today.","{S} declined to take part in preparing the meal.","{S} chose not to help prepare the meal this time."]},

 {id:"eat",label:"Eating",nf:"Amount Eaten (%)",verb:"ate {p} meal",noun:"eating",
  ind:["{S} ate independently.","{S} ate the meal without any support.","{S} managed the meal independently."],
  prompt:["{S} ate {r} with prompting from staff.","{S} ate {r}, with prompts from staff to keep going.","With prompting from staff, {s} ate {r}."],
  part:["{S} ate with some hands-on help from staff.","{S} ate {r} for part of the meal, and staff supported {o} for the rest.","Staff gave some hands-on help while {s} ate."],
  full:["Staff supported {o} to eat.","Staff gave {o} full support to eat.","{S} {vbe} fully supported by staff to eat."],
  declined:["{S} declined the meal.","{S} did not want to eat at this time.","{S} chose not to have the meal."]},

 {id:"drink",label:"Drinking",nf:"Daily Fluid Intake",verb:"had {p} drink",noun:"drinking",
  ind:["{S} had {p} drink without support.","{S} drank independently.","{S} managed {p} drink independently."],
  prompt:["{S} drank after a prompt from staff.","Following a prompt, {s} had {p} drink.","Once prompted by staff, {s} drank."],
  part:["{S} drank with some hands-on help from staff.","Staff supported {o} with part of {p} drink.","Staff gave some hands-on help while {s} drank."],
  full:["Staff supported {o} to drink.","Staff gave {o} full support with {p} drink.","{S} {vbe} fully supported by staff to drink."],
  declined:["{S} declined a drink at this point.","{S} did not want a drink.","{S} chose not to have a drink at this point."]}
],

medication:[
 {id:"medtake",label:"Taking the medication",nf:"Support to take medication",
  opts:["{p} tablets","{p} liquid medicine","{p} inhaler","{p} eye drops","{p} prescribed cream"],verb:"took {opt}",
  ind:["{S} took {opt} {r}, with no hands-on help.","{S} managed {opt} without support.","{S} took {opt} independently, without hands-on help."],
  prompt:["{S} took {opt} after a prompt from staff.","With prompting, {s} took {opt} {r}.","Once prompted by staff, {s} took {opt}."],
  part:["{S} took {opt} with some hands-on help from staff.","Staff handed {o} {opt} and {s} took them {r}.","Staff gave some hands-on help while {s} took {opt}."],
  full:["Staff administered {opt}.","Staff gave {o} {opt}.","{S} {vbe} given {opt} by staff."],
  declined:["{S} declined {opt}.","{S} did not want {opt} on this occasion.","{S} chose not to have {opt}."]},
 {id:"medwater",label:"Having a drink with it",nf:"Daily note",verb:"had a drink with it",noun:"a drink with it",
  ind:["{S} had a drink with it {r}.","{S} got {r} a drink to take it with.","{S} took a drink with it without help."],
  prompt:["{S} had a drink with it after a prompt.","Following a prompt, {s} had a drink with it.","Staff prompted {o}, and {s} then had a drink with it."],
  part:["{S} had a drink with it, with some help from staff.","Staff helped {o} with a drink to take it with.","With some help from staff, {s} had a drink to take it with."],
  full:["Staff gave {o} a drink to take it with.","Staff held the drink for {o} to take it with.","{S} {vbe} given a drink by staff to take it with."],
  declined:["{S} did not want a drink with it.","{S} declined a drink with it.","{S} chose not to have a drink with it."]}
],

abc:[], incident:[],

activity:[
 {id:"plan",label:"Planning &amp; preparing",nf:"Daily note",phase:"start",verb:"got ready",noun:"getting ready",
  ind:["{S} got ready for {act} without any help.","{S} prepared for {act} independently.","{S} did all the preparation for {act} {r}."],
  prompt:["{S} got ready for {act} with prompts from staff.","With prompting, {s} got ready for {act}.","{S} prepared for {act}, with staff giving prompts."],
  part:["{S} got ready for {act} with some hands-on help from staff.","Staff supported {o} to get ready for {act}.","Staff gave {o} some hands-on help to get ready for {act}."],
  full:["Staff got everything ready for {act}.","Staff prepared for {act} on {p} behalf.","Staff did the preparation for {act}."],
  declined:["{S} declined {act} at the planning stage.","{S} did not want to go ahead with {act} and this was respected.","When {act} was being planned, {s} chose not to go ahead with it."]},

 {id:"travel",label:"Travelling there",nf:"Daily note",phase:"start",
  opts:["by cab","by bus","by train","on foot","in the staff vehicle","by minibus"],
  verb:"travelled {opt}",
  ind:["{S} travelled {opt} independently.","{S} made {p} own way there {opt} without support.","{S} made the journey {opt} without help."],
  prompt:["{S} travelled {opt} with prompting from staff.","Staff travelled {opt} with {o} and gave prompts where needed.","{S} made the journey {opt}, with staff prompting where needed."],
  part:["{S} travelled {opt} with some support from staff.","Staff supported {o} for part of the journey {opt}.","Staff gave {o} some support on the journey {opt}."],
  full:["Staff supported {o} throughout the journey {opt}.","{S} travelled {opt} with full support from staff.","{S} {vbe} fully supported by staff on the journey {opt}."],
  declined:["{S} declined to travel {opt} today.","{S} chose not to travel {opt}, and this was respected.","{S} did not want to travel {opt}."]},

 {id:"engage",label:"Taking part",nf:"Daily note",verb:"{did}",
  ind:["{S} {did} without any support.","{S} {did} on {p} own.","{S} {did} independently."],
  prompt:["{S} {did} with prompts from staff.","{S} {did} following prompts from staff.","With prompting, {s} {did}."],
  part:["{S} {did} with some support from staff.","{S} did part of {act} {r} and staff supported with the rest.","With some support from staff, {s} {did}."],
  full:["Staff supported {o} throughout {act}.","{S} {vbe} fully supported by staff during {act}.","Staff gave {o} full support for the whole of {act}."],
  declined:["{S} chose not to take part in {act}.","{S} declined {act}.","{S} did not want to take part in {act}."]},

 {id:"tools",label:"Using equipment",nf:"Daily note",verb:"used the equipment",noun:"using the equipment",
  ind:["{S} used the equipment without supervision.","{S} set up and used the equipment {r}.","{S} used the equipment independently."],
  prompt:["{S} used the equipment after prompts from staff.","Following prompts from staff, {s} used the equipment.","Staff prompted {o}, and {s} then used the equipment."],
  part:["{S} used the equipment with some support from staff.","{S} used the equipment, with staff supporting part of the task.","Staff gave {o} some support as {s} used the equipment."],
  full:["Staff operated the equipment.","The equipment was operated by staff.","Staff used the equipment on {p} behalf."],
  declined:["{S} did not want to use the equipment today.","{S} declined to use the equipment.","{S} chose not to use the equipment."]},

 {id:"money",label:"Money &amp; paying",nf:"Daily note",verb:"paid",noun:"paying",
  ind:["{S} paid {r}.","{S} handled {p} own money and paid independently.","{S} paid without any help."],
  prompt:["{S} paid after a prompt from staff.","Following a prompt, {s} paid {r}.","Staff prompted {o}, and {s} then paid."],
  part:["{S} paid with some support from staff.","Staff supported {o} with part of paying.","{S} paid, with staff supporting part of it."],
  full:["Staff handled the payment.","Payment was made by staff.","Staff paid on {p} behalf."],
  declined:["{S} did not want to handle money today.","{S} declined to pay.","{S} chose not to pay."]},

 {id:"tidy",label:"Clearing up afterwards",nf:"Daily note",phase:"end",verb:"cleared up afterwards",noun:"clearing up",
  ind:["{S} cleared up afterwards without support.","{S} tidied away independently.","{S} did the clearing up {r} afterwards."],
  prompt:["{S} cleared up after a prompt from staff.","Following a prompt, {s} tidied away {r}.","Staff prompted {o}, and {s} then cleared up."],
  part:["{S} cleared up with some help from staff.","Staff and {N} cleared up together afterwards.","With some help from staff, {s} cleared up afterwards."],
  full:["Staff cleared up afterwards.","Clearing up was done by staff.","Staff did the clearing up afterwards."],
  declined:["{S} did not want to clear up today.","{S} declined to help tidy away.","{S} chose not to clear up."]},

 {id:"finish",label:"Finishing &amp; coming home",nf:"Daily note",phase:"end",
  ind:["{S} decided when to finish.","{S} chose when to stop.","{S} made {p} own decision about when to finish."],
  prompt:["{S} finished after a prompt from staff.","Following a prompt, {s} finished.","Staff prompted {o}, and {s} then finished."],
  min:["{S} finished with minimal support from staff.","Minimal support from staff was needed to finish.","Staff gave {o} minimal support to finish."],
  part:["{S} finished {act} with some support from staff.","Staff supported {o} to finish {act}.","With some support from staff, {s} finished {act}."],
  full:["Staff brought {act} to a close.","Staff ended {act}.","Staff drew {act} to a close."],
  declined:["{S} did not want to finish {act}.","{S} wanted to carry on with {act}.","{S} did not want {act} to end."]}
]};

/* minimal hands-on help, said the same way for every task that has a verb */
const MIN_FROM_VERB = ["{S} {verb} with minimal hands-on help from staff.","{S} {verb}, needing only a little hands-on help.","Staff gave a little hands-on help as {s} {verb}."];
Object.keys(TASKS).forEach(k => TASKS[k].forEach(t => {
  if(!t.min && t.verb) t.min = MIN_FROM_VERB.map(x => x.replace("{verb}", t.verb));
}));

/* several tasks at the same level, said once - what the person did first */
const GROUPBANK = {
  ind:["{S} {list} without any support.","Without any help, {s} {list}.","{S} {list} independently."],
  prompt:["With prompting, {s} {list}.","{S} {list}, needing only prompts from staff.","{S} {list} with prompts from staff."],
  min:["{S} {list} with minimal hands-on help.","With a little hands-on help from staff, {s} {list}.","{S} {list}, needing only a little hands-on help."],
  full:["Staff gave {o} full support with {nouns}.","{S} {vbe} fully supported by staff with {nouns}.","{S} received full support from staff with {nouns}."],
  declined:["{S} declined {nouns}.","{S} chose not to have support with {nouns}.","{S} said no to {nouns}."]
};

/* the overall level, said only when no task row carries a level */
const LEVELBANK = {
  ind:["{S} completed this independently.","No hands-on support was needed.","{S} managed the whole interaction {r}."],
  prompt:["Support was limited to prompting; no hands-on help was needed.","{S} needed prompts only, with no hands-on support.","{S} managed with prompts alone and needed no hands-on help."],
  min:["{S} needed minimal hands-on support.","Support was kept to minimal hands-on help.","Only minimal hands-on support was needed."],
  part:["{S} did what {s} could {r} and staff supported with the rest.","Support was shared: {s} did part {r} and staff supported with the rest.","{S} managed part of it {r}, and staff supported with the rest."],
  full:["Staff provided full hands-on support.","Full hands-on support was given by staff.","Support was fully hands-on and provided by staff."]
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
  ["cooking","Cookery class","{p} cookery class","attended {p} cookery class"],
  ["baking","Baking","{p} baking class","attended {p} baking class"],
  ["dance","Dance","{p} dance class","attended {p} dance class"],
  ["singing","Singing","{p} singing class","attended {p} singing class"],
  ["exercise","Exercise","{p} exercise class","attended {p} exercise class"],
  ["allotment","Allotment","{p} allotment session","attended {p} allotment session"],
  ["art","Art class","{p} art class","attended {p} art class"],
  ["pop","Playing Pop","{p} Playing Pop session","attended {p} Playing Pop session"],
  ["tabletennis","Table tennis","{p} table tennis session","attended {p} table tennis session"],
  ["drama","Drama","{p} drama class","attended {p} drama class"],
  ["connect","Connect &amp; communication","{p} Connect and Communication session","attended {p} Connect and Communication session"],
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
  agreed:["offer","college"], nonverbal:"all", delayed:["offer","college"], declined:"all", noresp:"all",
  keen:"college", agreedgo:"college", encouraged:"college", reluctant:"college", declinedgo:"college",
  happy:"med", hesitant:"med"
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
         "{S} worked on a skill {s} {vhave} been building.","{S} spent time on a skill {s} {vhave} been practising."],
  instructions:["{S} followed the tutor's instructions.",
                "{S} listened to the tutor and followed the instructions given.","{S} did as the tutor instructed."],
  alongside:["{S} worked alongside others.",
             "{S} shared the space and the work with others.","{S} worked side by side with others."],
  conversation:["{S} talked with others during the session.",
                "{S} joined in conversation with others.","{S} took part in conversation with others."],
  turn:["{S} waited {p} turn and shared with others.",
        "{S} took turns with the others.","{S} shared and took turns with others."],
  askedhelp:["{S} asked for help when {s} needed it.",
             "{S} let staff know when {s} needed help.","When {s} needed help, {s} asked for it."],
  safe:["{S} used tools and equipment safely.",
        "{S} handled the equipment safely.","{S} handled tools and equipment in a safe way."],
  finished:["{S} finished a piece of work.",
            "{S} completed a piece of work.","{S} saw a piece of work through to the end."],
  pride:["{S} showed pride in what {s} had done.",
         "{S} {vbe} visibly pleased with {p} work.","{S} took pride in what {s} had done."],
  change:["{S} managed a change of plan.",
          "{S} coped with a change to the usual plan.","{S} adapted to a change of plan."]
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
  "At {time}, {N} was due at college for {act}{ratio}.","{N} was timetabled for {act} at college at {time}{ratio}."
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
 "{meal2} was offered to {N} at {time}{ratio}."],
medication:[
 "{N} was offered {med} at {time}{ratio}.",
 "At {time}, staff offered {N} {med}{ratio}.",
 "{Med} was offered to {N} at {time}{ratio}."],
abc:[
 "At {time}, the following happened with {N}{where}{ratio}.",
 "The following was observed with {N}{where} at {time}{ratio}.",
 "This is a record of what happened with {N}{where} at {time}{ratio}."],
incident:[
 "At {time}, {N} was involved in {incType}{where}{ratio}.",
 "{N} was involved in {incType}{where} at {time}{ratio}.",
 "{IncType} involving {N} happened{where} at {time}{ratio}."]
};

/* what was offered, when it is not already named by the opener */
const OFFERBANK = {
 two:["{S} {vbe} offered a choice of {offerA} or {offerB}.","Staff offered {o} a choice of {offerA} or {offerB}.","The options offered were {offerA} or {offerB}."],
 one:["{S} {vbe} offered {offerA}.","Staff offered {o} {offerA}.","Staff gave {o} the option of {offerA}."]
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
 ateWhat:["{P} meal was {whatAte}; {s} ate {ate} of it.","{S} had {whatAte} and ate {ate} of it.","{S} ate {ate} of {p} meal, which was {whatAte}."],
 ate:["{S} ate {ate} of {p} meal.","{S} ate {ate} of what was served.","Of {p} meal, {s} ate {ate}."],
 what:["{S} had {whatAte}.","{P} meal was {whatAte}.","The meal {s} had was {whatAte}."],
 offeredDrunk:["{S} {vbe} offered {offered}ml{ofDrink} and drank {drunk}ml.","{S} drank {drunk}ml of the {offered}ml{ofDrink} offered.","Staff offered {o} {offered}ml{ofDrink}; {s} drank {drunk}ml."],
 drunk:["{S} drank {drunk}ml{ofDrink}.","{S} had {drunk}ml{ofDrink} to drink.","The amount {s} drank was {drunk}ml{ofDrink}."],
 drink:["{S} chose {drink} to drink.","{S} picked {drink} as {p} drink.","{S} decided on {drink} to drink."]
};
const COMMBANK = {
 verbal:["Staff used short, clear sentences.","Staff spoke in short, simple sentences.","Staff kept the language short and clear."],
 makaton:["Staff used Makaton signing.","Makaton signs were used by staff.","Staff signed in Makaton."],
 pictures:["Staff used {p} picture-based communication book.","Pictures were used to communicate with {o}.","Staff showed {o} pictures from {p} communication book."],
 nownext:["Staff used a Now and Next board.","A Now and Next board was used with {o}.","Staff set out what was happening on a Now and Next board."],
 objects:["Staff used objects of reference.","Objects of reference were used with {o}.","Staff communicated with {o} using objects of reference."],
 gesture:["Staff watched {p} body language and responded to the cues {s} gave.","Staff read {p} gestures and expressions.","Staff picked up on {p} body language and responded to it."]
};
const RESPBANK = {
 happy:["{S} {vbe} happy to take it.","{S} took it willingly.","{S} {vbe} willing to take it."],
 hesitant:["{S} {vbe} hesitant at first. {declined} {S} then agreed to take it.","{S} hesitated to begin with. {declined} {S} then took it.","{S} held back at first. {declined} {S} then agreed to take it."],
 choseA:["{S} chose {chosen}.","{S} indicated {chosen}.","{S} picked {chosen}."],
 choseB:["{S} chose {chosen}.","{S} went for {chosen}.","{S} selected {chosen}."],
 agreed:["{S} agreed to what was offered.","{S} agreed to go ahead.","{S} accepted the offer."],
 nonverbal:["{S} gave a clear non-verbal response.","{S} made {p} preference clear without words.","{S} showed {p} choice non-verbally."],
 delayed:["{S} declined at first. {declined} {S} then agreed.","{S} said no to begin with. {declined} {S} then agreed.","{S} did not agree at first. {declined} {S} then agreed."],
 declined:["{S} declined. {declined}","{S} did not want to go ahead. {declined}","{S} said no. {declined}"],
 keen:["{S} {vbe} ready and keen to go.","{S} {vbe} keen to go and ready to leave.","{S} {vbe} eager and ready to go."],
 agreedgo:["{S} agreed readily to go.","{S} readily agreed to attend.","{S} {vbe} quick to agree to go."],
 encouraged:["{S} needed some encouragement before agreeing to go.","{S} agreed to go after some encouragement from staff.","With some encouragement from staff, {s} agreed to go."],
 reluctant:["{S} {vbe} reluctant at first. {declined} {S} then agreed to attend.","{S} did not want to go to begin with. {declined} {S} then agreed to go.","{S} {vbe} unwilling to go at first. {declined} {S} then agreed to attend."],
 declinedgo:["{S} declined to attend today. {declined}","{S} chose not to go to college today. {declined}","{S} did not want to attend today. {declined}"],
 noresp:["{S} did not give a clear response.","No clear response was given.","{S} gave no clear response."]
};
const HOWBANK = {
 said:["{S} told staff what {s} wanted.","{S} said so in {p} own words.","{S} said what {s} wanted."],
 pointed:["{S} pointed to {p} choice.","{S} made {p} choice by pointing.","{S} showed {p} choice by pointing to it."],
 signed:["{S} signed {p} choice.","{S} signed to show what {s} wanted.","{S} used signing to show {p} choice."],
 nodded:["{S} nodded to show {p} choice.","{S} nodded to let staff know.","{S} gave a nod to show {p} choice."],
 led:["{S} led staff to what {s} wanted.","{S} took staff to {p} choice.","{S} guided staff to {p} choice."],
 reached:["{S} reached for the option {s} wanted.","{S} reached out towards {p} choice.","{S} reached for {p} choice."],
 facial:["{P} facial expression made {p} preference clear.","{S} showed {p} preference through {p} facial expression.","{P} preference was clear from {p} facial expression."]
};
/* College is not offered on the day; what matters is that staff told the
   person it was college today, how they told them, and how the person showed
   they would go - all before the journey. The telling sentence exists only
   when a communication method is ticked; the method becomes its clause. */
const COMM_CLAUSE = {
 verbal:"in short, clear sentences", makaton:"using Makaton alongside speech", pictures:"using {p} picture-based communication book",
 nownext:"using {p} Now and Next board", objects:"using objects of reference", gesture:"with gesture and simple words"
};
const TELLBANK = [
 "{tellWhen}, staff told {N} that it was college today, for {act}{tellHow}.",
 "{tellWhen}, staff let {N} know it was college today and that {act} was on{tellHow}.",
 "{tellWhen}, staff explained to {N} that it was college today, for {act}{tellHow}."
];
const HOWBANK_COLLEGE = {
 said:["{S} told staff {s} {vbe} happy to go.","{S} said {s} wanted to go.","{S} said {s} would like to go."],
 pointed:["{S} pointed to show {s} understood and would go.","{S} pointed to show {s} would go.","{S} pointed to let staff know {s} would go."],
 signed:["{S} signed to show {s} would go.","{S} signed that {s} {vbe} happy to go.","{S} used signs to let staff know {s} would go."],
 nodded:["{S} nodded to show {s} would go.","{S} nodded when told.","{S} gave a nod when told."],
 led:["{S} led staff to the door, ready to go.","{S} took staff to the door to show {s} {vbe} ready.","{S} showed {s} {vbe} ready by leading staff to the door."],
 reached:["{S} reached for {p} things, ready to go.","{S} got {p} things together, ready to go.","{S} gathered {p} things, ready to go."],
 facial:["{P} expression showed {s} {vbe} happy to go.","{S} showed with {p} expression that {s} {vbe} happy to go.","{S} {vbe} happy to go, as {p} expression showed."]
};
const HOW_JOIN_COLLEGE = {
 said:"telling staff so", pointed:"pointing to show it", signed:"signing to show it", nodded:"nodding to show it",
 led:"leading staff to the door", reached:"reaching for {p} things", facial:"{p} expression making it clear"
};

/* the same, as a clause, so a choice and how it was shown can be one sentence */
const HOW_JOIN = {
 said:"telling staff in {p} own words", pointed:"pointing to {p} choice", signed:"signing {p} choice",
 nodded:"nodding to show {p} choice", led:"leading staff to it", reached:"reaching for it",
 facial:"showing it through {p} facial expression"
};
const CONSENTBANK = {
 yes:["Consent was obtained before any support began.","{S} gave consent before support started.","Consent was checked and given before staff began."],
 implied:["Consent was implied through {p} cooperation.","{S} cooperated, and consent was implied by {p} response.","Through {p} cooperation, {s} gave implied consent."],
 no:["Consent was not given.","{S} did not give consent.","No consent was given."]
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
 settled:["{S} remained settled throughout.","{S} {vbe} calm and settled.","{S} stayed settled."],
 cheerful:["{S} {vbe} cheerful.","{S} seemed in good spirits.","{S} {vbe} in a cheerful mood."],
 quiet:["{S} {vbe} quiet.","{S} {vbe} quiet during the interaction.","{S} came across as quiet."],
 chatty:["{S} chatted with staff.","{S} {vbe} talkative.","{S} {vbe} chatty with staff."],
 tired:["{S} appeared tired.","{S} seemed tired.","{S} looked tired."],
 anxious:["{S} appeared anxious.","{S} showed signs of anxiety.","{S} looked anxious."],
 unsettled:["{S} {vbe} unsettled at points.","{S} appeared unsettled.","{S} seemed unsettled at times."]
};
const WELLBANK = {
 nochange:["No change from {p} usual presentation, appetite or energy was observed.",
           "Nothing was different from {p} usual self.",
           "{S} presented as usual with no change in appetite, energy or mood."],
 appetite:["{P} appetite was different from usual today.","A change in {p} usual appetite was noticed today.","{P} appetite today was not the same as usual."],
 pain:["{S} showed signs of discomfort during the interaction.","Signs of discomfort were observed during the interaction.","Staff observed signs of discomfort during the interaction."],
 cough:["{S} coughed during the interaction.","Coughing was observed during the interaction.","During the interaction, {s} coughed."],
 sleep:["{S} had slept poorly.","{S} slept poorly.","{P} sleep had been poor."]
};

/* Context-aware observation sets. Each is shown only where it applies, and
   each choice has exactly the sentence it produces - nothing more. */
const DIGNITY = [["knocked","Knocked and waited before entering"],["door","Closed the door for privacy"],
                 ["covered","Kept them covered where possible"],["explained","Explained each step before doing it"]];
const DIGNITYBANK = {
 knocked:["Staff knocked and waited before entering.","Staff knocked and waited for a response before going in.","Before going in, staff knocked and waited."],
 door:["Staff closed the door to maintain {p} privacy.","The door was closed for {p} privacy.","Staff shut the door to protect {p} privacy."],
 covered:["Staff kept {o} covered where possible.","{S} {vbe} kept covered where possible.","Where possible, staff kept {o} covered."],
 explained:["Staff explained each step before doing it.","Each step was explained to {o} before it happened.","Staff talked {o} through each step before doing it."]
};

const CONT_OBS = [["urine","Passed urine"],["bowels","Bowels opened"],["dry","Dry when checked"],["episode","Incontinence episode"]];
const CONTBANK = {
 urine:["{S} passed urine.","{S} passed urine during the support.","Urine was passed by {o}."],
 bowels:["{S} opened {p} bowels.","{P} bowels were opened.","{S} had {p} bowels open."],
 dry:["{S} {vbe} dry when checked.","{S} {vbe} found to be dry.","When checked, {s} {vbe} dry."],
 episode:["{S} had an episode of incontinence.","An episode of incontinence occurred.","There was an episode of incontinence."]
};

const SLEEP_OBS = [["asleep","Asleep when checked"],["awakesettled","Awake and settled"],["awakeunsettled","Awake and unsettled"]];
const SLEEPBANK = {
 asleep:["{S} {vbe} asleep when checked.","{S} {vbe} asleep at the check.","When checked, {s} {vbe} asleep."],
 awakesettled:["{S} {vbe} awake and settled when checked.","{S} {vbe} awake but settled.","At the check, {s} {vbe} awake and settled."],
 awakeunsettled:["{S} {vbe} awake and unsettled when checked.","{S} {vbe} awake and appeared unsettled.","At the check, {s} {vbe} awake and unsettled."]
};

/* observable behaviour - what staff are asked for instead of "difficult" */
const BEHAVIOUR = [["raised","Raised voice"],["shouted","Shouted or swore"],["movedaway","Moved away from staff"],["declinedact","Declined the activity"],
                   ["pushed","Pushed an item away"],["threw","Threw an item"],["hitout","Hit out at someone"],["kicked","Kicked or pushed someone"],
                   ["grabbed","Grabbed someone or something"],["selfinj","Hit, bit or scratched themselves"],["damaged","Damaged property"],["smeared","Smeared faeces"],
                   ["askedleave","Repeatedly asked to leave"],["leave","Tried to leave the building"],["paced","Paced up and down"],
                   ["repeated","Repeated a question or phrase"],["cried","Cried"],["smiled","Smiled or laughed"],
                   ["other","Other \u2014 describe"]];
const BEHAVIOURBANK = {
 raised:["{S} raised {p} voice.","{S} spoke with a raised voice.","{S} used a raised voice."],
 movedaway:["{S} moved away from staff.","{S} moved away from the staff member.","{S} put some distance between {r} and staff."],
 declinedact:["{S} declined the activity.","{S} said no to the activity.","{S} declined to take part in the activity."],
 pushed:["{S} pushed an item away.","{S} pushed an item away from {r}.","An item was pushed away by {o}."],
 askedleave:["{S} asked to leave several times.","{S} repeatedly asked to leave.","{S} asked to leave on several occasions."],
 smiled:["{S} smiled and laughed.","{S} {vbe} seen smiling and laughing.","{S} {vbe} smiling and laughing."],
 shouted:["{S} shouted and swore.","{S} raised {p} voice and swore.","{S} shouted and used swear words."],
 threw:["{S} threw an item.","{S} picked up an item and threw it.","An item was thrown by {o}."],
 hitout:["{S} hit out at someone.","{S} struck out at someone.","{S} hit out at another person."],
 kicked:["{S} kicked or pushed someone.","{S} kicked out at someone.","{S} kicked out at another person."],
 grabbed:["{S} grabbed someone or something.","{S} took hold of someone or something.","{S} grabbed hold of someone or something."],
 selfinj:["{S} hit, bit or scratched {r}.","{S} hurt {r} by hitting, biting or scratching.","By hitting, biting or scratching, {s} hurt {r}."],
 damaged:["{S} damaged property.","Property was damaged by {o}.","{S} caused damage to property."],
 smeared:["{S} smeared faeces.","There was smearing of faeces by {o}.","Faeces were smeared by {o}."],
 leave:["{S} tried to leave the building.","{S} made for the door and tried to leave.","{S} attempted to leave the building."],
 paced:["{S} paced up and down.","{S} walked up and down repeatedly.","{S} {vbe} pacing up and down."],
 repeated:["{S} repeated a question or phrase.","{S} asked the same thing again and again.","{S} kept repeating a question or phrase."],
 cried:["{S} cried.","{S} {vbe} crying.","{S} {vbe} in tears."]
};

/* what was done about it - each one appears only when it was actually done */
const FOLLOWUP = [["handover","Handed over to the next shift"],["senior","Senior or manager informed"],
                  ["health","Health professional contacted"],["family","Family or representative informed"],
                  ["bodymap","Body map completed"],["mar","MAR chart signed"],["incident","Incident form completed"],
                  ["police","Police informed"],["safeguarding","Safeguarding concern raised in line with procedure"]];
const FOLLOWBANK = {
 handover:["This was handed over to the next shift.","Staff handed this over to the next shift.","This was included in the handover to the next shift."],
 senior:["A senior colleague or manager was informed.","Staff informed a senior colleague or manager.","Staff told a senior colleague or manager."],
 health:["A health professional was contacted.","Staff contacted a health professional.","Staff got in touch with a health professional."],
 family:["{P} family or representative was informed.","Staff informed {p} family or representative.","Staff let {p} family or representative know."],
 bodymap:["A body map was completed.","Staff completed a body map.","Staff filled in a body map."],
 mar:["The MAR chart was signed.","Staff signed the MAR chart.","The MAR chart was signed by staff."],
 incident:["An incident form was completed.","Staff completed an incident form.","Staff filled in an incident form."],
 police:["The police were informed.","Staff informed the police.","Staff let the police know."],
 safeguarding:["A safeguarding concern was raised in line with procedure.","Staff raised a safeguarding concern in line with procedure.","In line with procedure, staff raised a safeguarding concern."]
};

/* ---------- behaviour (ABC chart) and incidents ----------
   Before - what the person did - what staff did - how they responded - was
   anyone hurt. Observable throughout: the app records what happened and
   never why it happened; that is for the behaviour-support review. */
const WHERE = [["bedroom","Bedroom"],["bathroom","Bathroom"],["kitchen","Kitchen"],["living","Living room"],["dining","Dining room"],
               ["garden","Garden"],["hallway","Hallway"],["community","Out in the community"],["vehicle","In a vehicle"],["otherplace","Somewhere else"]];
const WHERE_PHRASE = { bedroom:" in {p} bedroom", bathroom:" in the bathroom", kitchen:" in the kitchen", living:" in the living room",
                       dining:" in the dining room", garden:" in the garden", hallway:" in the hallway", community:" out in the community",
                       vehicle:" in a vehicle", otherplace:"" };
const ABCWORD = { verbal:"shouting or swearing", physical:"physical behaviour towards others", selfinjury:"self-injury", property:"damage to property", smearing:"smearing",
                  withdrawal:"withdrawal", refusal:"refusing care or medication", leaving:"trying to leave the building", distress:"distress",
                  otherbeh:"behaviour that concerned staff" };
const INCWORD = { fall:"a fall", injury:"an injury", mederror:"a medication error", behaviour:"an incident involving behaviour towards others",
                  choking:"a choking incident", missing:"a missing-person incident", propertydamage:"damage to property",
                  safeguarding:"a safeguarding concern", allegation:"an allegation", environment:"an environmental incident", otherinc:"an incident" };
const BEFORE = [["routine","A change to the usual routine"],["noise","Noise or a busy environment"],["asked","Being asked to do something"],
                ["waiting","Waiting for something"],["toldno","Being told no, or having to stop"],["interaction","An interaction with another person"],
                ["transition","Moving from one activity to another"],["pain","Signs of pain or discomfort beforehand"],
                ["unwell","Seemed unwell or tired beforehand"],["nothing","Nothing noticeable"]];
const BEFOREBANK = {
 routine:["Just before, there had been a change to {p} usual routine.","Beforehand, {p} usual routine had changed.","{P} usual routine had been changed just before this."],
 noise:["Just before, the environment was noisy and busy.","It was noisy and busy beforehand.","The surroundings were noisy and busy just before."],
 asked:["Just before, {s} had been asked to do something.","Beforehand, staff had asked {o} to do something.","{S} had been asked to do something just before."],
 waiting:["Just before, {s} had been waiting for something.","Beforehand, {s} {vbe} waiting for something.","{S} had been waiting for something just before."],
 toldno:["Just before, {s} had been told no, or that {s} had to stop.","Beforehand, {s} had been told no, or asked to stop.","{S} had been told no, or asked to stop, just before."],
 interaction:["Just before, there had been an interaction with another person.","Beforehand, {s} had been interacting with someone else.","{S} had been interacting with another person just before."],
 transition:["Just before, {s} {vbe} moving from one activity to another.","It happened as {s} {vbe} changing from one activity to another.","{S} {vbe} moving between activities just before."],
 pain:["Beforehand, {s} had shown signs of pain or discomfort.","There were signs of pain or discomfort beforehand.","{S} had been showing signs of pain or discomfort beforehand."],
 unwell:["Beforehand, {s} had seemed unwell or tired.","{S} had seemed unwell or tired beforehand.","Before this, {s} had seemed unwell or tired."],
 nothing:["Nothing noticeable happened beforehand.","Staff noticed nothing unusual beforehand.","Nothing unusual was noticed beforehand."]
};
const STAFFDID = [["reassured","Reassured them verbally"],["space","Gave them space and time"],["distraction","Used distraction"],
                  ["redirected","Redirected them to something else"],["calming","Used a calming technique (breathing, music)"],
                  ["quiet","Moved to a quieter space"],["sensory","Reduced noise or light"],["alternative","Offered an alternative activity"],
                  ["comfort","Offered physical comfort, which they accepted"],["prn","PRN medication given as prescribed"],
                  ["safety","Moved others or items to keep everyone safe"],["wash","Supported them to wash and change"],
                  ["cleaned","Cleaned and disinfected the area"],["senior","Called a senior colleague for support"],
                  ["stayed","Stayed nearby and watched"],["plan","Followed their behaviour support plan"]];
const STAFFBANK = {
 reassured:["Staff reassured {o} verbally.","Staff spoke to {o} calmly and reassured {o}.","Staff reassured {o} by talking to {o}."],
 space:["Staff gave {o} space and time.","Staff stepped back and gave {o} time.","Staff allowed {o} space and time."],
 distraction:["Staff used distraction.","Staff tried to distract {o}.","Staff used distraction techniques with {o}."],
 redirected:["Staff redirected {o} to something else.","Staff guided {o} towards something else.","Staff steered {o} on to something else."],
 calming:["Staff used a calming technique with {o}.","Staff used a calming technique, such as breathing or music.","A calming technique was used with {o}."],
 quiet:["Staff supported {o} to a quieter space.","{S} {vbe} supported to move to a quieter space.","Staff helped {o} move to a quieter space."],
 sensory:["Staff reduced the noise and light around {o}.","Noise and light were reduced.","The noise and light around {o} were reduced by staff."],
 alternative:["Staff offered {o} an alternative activity.","An alternative activity was offered.","{S} {vbe} offered a different activity."],
 comfort:["Staff offered physical comfort, which {s} accepted.","{S} accepted physical comfort from staff.","{S} accepted the physical comfort staff offered."],
 prn:["PRN medication was given as prescribed.","{P} PRN medication was given as prescribed.","{S} {vbe} given PRN medication as prescribed."],
 safety:["Staff moved others and items away to keep everyone safe.","Staff kept everyone safe by moving others and items away.","To keep everyone safe, staff moved others and items away."],
 wash:["Staff supported {o} to wash and change.","{S} {vbe} supported to wash and change.","Staff helped {o} to wash and change."],
 cleaned:["Staff cleaned and disinfected the area.","The area was cleaned and disinfected by staff.","Staff cleaned the area and then disinfected it."],
 senior:["Staff called a senior colleague for support.","A senior colleague was called to support.","Staff called on a senior colleague for support."],
 stayed:["Staff stayed nearby and kept watch.","Staff remained nearby, watching.","Staff kept watch from nearby."],
 plan:["Staff followed {p} behaviour support plan.","{P} behaviour support plan was followed.","Staff worked to {p} behaviour support plan."]
};
const AFTER = [["quick","Settled within a few minutes"],["gradual","Settled gradually"],["laterst","Settled later in the shift"],
               ["nochange","No change while staff were with them"],["worse","Became more distressed at first"],["unsettled","Remained unsettled"]];
const AFTERBANK = {
 quick:["{S} settled within a few minutes.","Within a few minutes, {s} had settled.","{S} {vbe} settled within a few minutes."],
 gradual:["{S} settled gradually.","{S} gradually became calmer.","{S} settled bit by bit."],
 laterst:["{S} settled later in the shift.","{S} did not settle straight away but did later in the shift.","Later in the shift, {s} settled."],
 nochange:["There was no change while staff were with {o}.","{S} stayed the same while staff were with {o}.","While staff were with {o}, there was no change."],
 worse:["{S} became more distressed at first.","At first {s} became more distressed.","Initially, {s} became more distressed."],
 unsettled:["{S} remained unsettled.","{S} stayed unsettled.","{S} continued to be unsettled."]
};
const IMPACT = [["none","No one was hurt and nothing was damaged"],["risk","Someone was at risk but no one was hurt"],
                ["hurt","Someone was hurt"],["damage","Property was damaged"]];
const IMPACTBANK = {
 none:["No one was hurt and nothing was damaged.","Nobody was hurt and there was no damage.","There were no injuries and no damage."],
 risk:["Someone was at risk, but no one was hurt.","There was a risk to someone, but no one was hurt.","No one was hurt, though someone was at risk."],
 hurt:["Someone was hurt.","Someone was hurt during this.","A person was hurt."],
 damage:["Property was damaged.","There was damage to property.","Some property was damaged."]
};
const IMPACTWHO = [["self","The person themselves"],["staff","A member of staff"],["otherperson","Another person"]];
const IMPACTWHOBANK = { self:["{S} {vbe} hurt.","{S} {vbe} the one hurt.","{S} {vbe} the person who was hurt."], staff:["A member of staff was hurt.","A staff member was hurt.","One of the staff was hurt."],
                        otherperson:["Another person was hurt.","Someone else was hurt.","A different person was hurt."] };
const HAPPENED = {
  fall:[["fall-found","Found on the floor"],["fall-seen","Seen to fall"],["fall-trip","Tripped"],["fall-slip","Slipped"],["fall-bed","Fell from bed"],["fall-chair","Fell from a chair"]],
  choking:[["chok-cough","Coughing"],["chok-nospeak","Could not speak or breathe"],["chok-back","Back blows given"],["chok-abdo","Abdominal thrusts given"],
           ["chok-self","Cleared it by coughing"],["chok-staff","Cleared with staff help"]],
  missing:[["miss-left","Left the building unaccompanied"],["miss-search","Staff searched the area"],["miss-found","Found by staff"],
           ["miss-returned","Returned by themselves"],["miss-brought","Brought back by someone else"]],
  mederror:[["med-missed","A dose was missed"],["med-wrongtime","Given at the wrong time"],["med-dropped","A dose was dropped or spilled"],
            ["med-wrongperson","Given to the wrong person"],["med-wrongdose","The wrong dose was given"]],
  propertydamage:[["prop-broke","Something was broken"],["prop-thrown","Something was thrown"],["prop-wall","A wall, door or window was damaged"]]
};
const HAPPENEDBANK = {
 "fall-found":["{S} {vbe} found on the floor.","Staff found {o} on the floor.","{S} {vbe} on the floor when staff found {o}."], "fall-seen":["{S} {vbe} seen to fall.","Staff saw {o} fall.","Staff witnessed {o} falling."],
 "fall-trip":["{S} tripped.","{S} tripped and fell.","{S} had a trip."], "fall-slip":["{S} slipped.","{S} slipped and fell.","{S} had a slip."],
 "fall-bed":["{S} fell from {p} bed.","{S} fell out of bed.","{S} had a fall from {p} bed."], "fall-chair":["{S} fell from a chair.","{S} fell from {p} chair.","{S} had a fall from a chair."],
 "chok-cough":["{S} {vbe} coughing.","{S} began coughing.","{S} started coughing."], "chok-nospeak":["{S} could not speak or breathe.","{S} {vbe} unable to speak or breathe.","{S} {vbe} not able to speak or breathe."],
 "chok-back":["Back blows were given.","Staff gave back blows.","Staff carried out back blows."], "chok-abdo":["Abdominal thrusts were given.","Staff gave abdominal thrusts.","Staff carried out abdominal thrusts."],
 "chok-self":["{S} cleared it by coughing.","{S} coughed it clear {r}.","{S} managed to clear it {r} by coughing."], "chok-staff":["It was cleared with help from staff.","Staff helped {o} clear it.","With help from staff, it was cleared."],
 "miss-left":["{S} left the building unaccompanied.","{S} went out of the building without staff.","{S} left the building without a member of staff."],
 "miss-search":["Staff searched the area.","Staff searched the building and surrounding area.","Staff carried out a search of the area."],
 "miss-found":["{S} {vbe} found by staff.","Staff found {o}.","Staff located {o}."], "miss-returned":["{S} returned by {r}.","{S} came back on {p} own.","{S} made {p} own way back."],
 "miss-brought":["{S} {vbe} brought back by someone else.","Someone else brought {o} back.","Another person brought {o} back."],
 "med-missed":["A dose was missed.","A dose of medication was missed.","A scheduled dose was missed."], "med-wrongtime":["It was given at the wrong time.","The medication was given at the wrong time.","It was not given at the right time."],
 "med-dropped":["A dose was dropped or spilled.","A dose of medication was dropped or spilled.","A dose was spilled or dropped."],
 "med-wrongperson":["It was given to the wrong person.","The medication was given to the wrong person.","The medication went to the wrong person."],
 "med-wrongdose":["The wrong dose was given.","The dose given was wrong.","An incorrect dose was given."],
 "prop-broke":["Something was broken.","An item was broken.","An object was broken."], "prop-thrown":["Something was thrown.","An item was thrown.","An object was thrown."],
 "prop-wall":["A wall, door or window was damaged.","There was damage to a wall, door or window.","Damage was caused to a wall, door or window."]
};
const INJURY = [["noinjury","No injury seen"],["injury","Injury seen"]];
const INJURYTYPE = [["bruise","Bruise"],["cut","Cut"],["graze","Graze"],["skintear","Skin tear"],["swelling","Swelling"],["burn","Burn"],["otherinjury","Other"]];
const INJURYOBS = [["bleeding","Bleeding"],["head","Hit their head"],["conscious","Conscious and alert throughout"],
                   ["unconscious","Brief loss of consciousness observed"],["painobs","Complained of or showed pain"]];
const INJURYOBSBANK = {
 bleeding:["There was bleeding.","The injury was bleeding.","Bleeding was present."], head:["{S} hit {p} head.","{S} banged {p} head.","{S} sustained a blow to {p} head."],
 conscious:["{S} {vbe} conscious and alert throughout.","{S} remained conscious and alert.","{S} stayed conscious and alert throughout."],
 unconscious:["A brief loss of consciousness was observed.","{S} briefly lost consciousness.","For a short time, {s} lost consciousness."],
 painobs:["{S} complained of pain or showed signs of it.","{S} showed signs of pain.","There were signs that {s} {vbe} in pain."]
};
const ACTIONS = [["firstaid","First aid given"],["stayed","Stayed with them"],["checked","Checked them for injuries"],["safe","Made the area safe"],
                 ["moved","Moved others to safety"],["ambulance","Ambulance called"],["nhsline","NHS non-emergency line called"],
                 ["gp","GP contacted"],["hospital","Taken to hospital"],["prn","PRN medication given as prescribed"],
                 ["observations","Observations started (say how often in the handover)"]];
const ACTIONBANK = {
 firstaid:["First aid was given.","Staff gave first aid.","{S} {vbe} given first aid."], stayed:["Staff stayed with {o}.","Staff remained with {o} throughout.","Staff kept {o} company."],
 checked:["Staff checked {o} for injuries.","{S} {vbe} checked for injuries.","Staff looked {o} over for injuries."], safe:["Staff made the area safe.","The area was made safe.","The area was made safe by staff."],
 moved:["Staff moved others to safety.","Others were moved to safety.","Others were taken to safety by staff."], ambulance:["An ambulance was called.","Staff called an ambulance.","An ambulance was called by staff."],
 nhsline:["The NHS non-emergency line was called.","Staff called the NHS non-emergency line for advice.","Staff rang the NHS non-emergency line."],
 gp:["The GP was contacted.","Staff contacted the GP.","The GP was contacted by staff."], hospital:["{S} {vbe} taken to hospital.","{S} went to hospital.","{S} attended hospital."],
 prn:["PRN medication was given as prescribed.","{P} PRN medication was given as prescribed.","{S} {vbe} given PRN medication as prescribed."],
 observations:["Observations were started.","Staff began regular observations.","Staff started observations."]
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
 "laundry-machine":["machine"], "laundry-folded":["folded"],
 "social-friends":["(?:his|her|their) friends","met up with"], "social-joined":["joined in"], "social-new":["someone new","new (?:friend|person)"],
 "social-snack":["bought (?:a|some|himself|herself|themselves)","(?:a|his|her|their) (?:drink|snack|crisps|coke|juice)"],
 /* before, behaviour, what staff did, injuries, actions */
 routine:["change (?:to|in) (?:his|her|their|the) routine","routine (?:had )?changed"], noise:["noisy","loud","busy"], asked:["(?:was|were) asked to","asked (?:him|her|them) to"],
 waiting:["waiting for"], toldno:["told (?:him|her|them)? ?no","had to stop","asked to stop"], transition:["moving (?:from|to)","transition"],
 shouted:["shout","swor(?:e|ing)","swear"], threw:["threw","throwing"], hitout:["hit (?:out|at|a|the|staff|another)","punch","slapp"], kicked:["kick"],
 grabbed:["grabb"], smeared:["smear"], wash:["(?:wash|shower|bath)(?:ed)? and chang","supported (?:him|her|them) to (?:wash|shower|bathe?)"], cleaned:["disinfect","cleaned (?:the|up|it)"], selfinj:["(?:hit|bit|scratch(?:ed|ing)) (?:himself|herself|themselves)","self[- ]harm","head[- ]bang"], damaged:["damag","broke (?:the|a)"],
 leave:["(?:tried|trying) to leave","made for the door","ran (?:out|off)"], paced:["pac(?:ed|ing)"], repeated:["repeat(?:ed|ing)","again and again"], cried:["cr(?:ied|ying)","tears"],
 reassured:["reassur"], space:["gave (?:him|her|them) (?:some )?(?:space|time)","stepped back"], distraction:["distract"], redirected:["redirect"],
 calming:["breathing","calming"], quiet:["quiet(?:er)? (?:room|space|area)"], alternative:["alternative activity","offered (?:him|her|them) something else"],
 stayed:["stayed (?:with|nearby|close)"], senior:["senior","team leader","called (?:the )?manager"],
 firstaid:["first aid"], ambulance:["ambulance","paramedic","999"], gp:["\\bgp\\b","doctor"], hospital:["hospital","a&e"], checked:["checked (?:him|her|them) (?:over|for)"],
 bleeding:["bleed","blood"], head:["(?:hit|bang|bump)(?:ed)? (?:his|her|their) head"], conscious:["conscious","alert"], painobs:["\\bpain\\b","sore","hurt(?:ing)?"],
 explained:["told (?:him|her|them) what (?:it|the medication|the tablets?|they) (?:was|were|is|are)","explained (?:what|the medication|why)"],
 label:["mar chart","checked the label"], water:["(?:glass|drink|sip) of water","with (?:a|some) (?:drink|water|juice)"],
 watched:["stayed (?:with|until)","watched (?:him|her|them) take"], prescribed:["as prescribed"],
 spat:["spat","spit"], swallow:["difficulty swallowing","struggled to swallow","hard to swallow"], late:["later than","given late"],
 partial:["only (?:took|had) (?:some|part|half|one)","did not take all"],
 "comm-greeted":["greeted","said hello","waved (?:to|at)"], "comm-turns":["took turns (?:talking|speaking|in)","turn[- ]taking"],
 "comm-aid":["communication aid","(?:his|her|their) (?:ipad|tablet|talker|device)"], "comm-symbols":["symbols?","picture(?:s| card)"],
 "comm-listened":["listened (?:to|while)"], "comm-newsign":["new (?:word|sign)"], "comm-initiated":["started (?:a|the) conversation","initiated"], "chores-room":["(?:his|her|their) (?:own )?room"], "chores-hoover":["hoover","vacuum","dust(?:ed|ing)"],
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
 /* enjoyment, and how it met their wishes */
 throughout:["enjoyed (?:it|himself|herself|themselves|every)","loved (?:it|every)","had a (?:great|lovely|good|wonderful|fantastic) time"],
 parts:["enjoyed (?:some|parts|the first|the second)"],
 asked:["had asked (?:to|for)","asked to (?:go|do) this"], social:["with (?:his|her|their) friends","people (?:he|she|they) likes?"],
 out:["out in the community","out and about"], routine:["(?:his|her|their) (?:usual|weekly|regular) routine"],
 control:["(?:his|her|their) own choice","chose (?:for|to) (?:himself|herself|themselves)"],
 /* continence and sleep */
 urine:["passed urine","\\bwee\\b","urinated","pass(?:ed)? water"], bowels:["bowels","\\bstool\\b"], dry:["\\b(?:was|were) dry\\b"],
 episode:["incontinen","\\bwet (?:the|his|her|their|himself|herself|themselves)","soiled"],
 asleep:["asleep","sleeping"], awakesettled:["awake (?:and|but) settled"], awakeunsettled:["awake and (?:unsettled|upset|agitated|distressed)"]
};

/* What the care record asks of an activity note, beyond what was done: how
   much the person enjoyed it, and how it met their wishes and outcomes. Each
   is a tick with exactly its own sentence. */
const ENJOY = [["throughout","Enjoyed it throughout"],["parts","Enjoyed parts of it"],
               ["notmuch","Did not appear to enjoy it"],["unclear","Hard to tell how much they enjoyed it"]];
const ENJOYBANK = {
 throughout:["{S} appeared to enjoy it throughout.","{S} clearly enjoyed {r} throughout.","{S} seemed to enjoy it from start to finish."],
 parts:["{S} appeared to enjoy parts of it.","{S} enjoyed some parts more than others.","{S} seemed to enjoy some parts of it."],
 notmuch:["{S} did not appear to enjoy it.","{S} showed little sign of enjoying it.","{S} did not seem to enjoy it."],
 unclear:["It was hard to tell how much {s} enjoyed it.","How much {s} enjoyed it was hard to tell.","It was not easy to tell how much {s} enjoyed it."]
};
const BENEFIT = [["asked","Something they had asked to do"],["goal","Works towards a goal in their support plan"],
                 ["routine","Part of a routine they value"],["social","Time with people they like being with"],
                 ["out","Time out and about in the community"],["control","Gave them choice and control over their day"],
                 ["confidence","Built their confidence"]];
const BENEFITBANK = {
 asked:["This was something {s} had asked to do.","{S} had asked to do this.","Doing this was {p} own request."],
 goal:["This works towards a goal in {p} support plan.","It is part of working towards a goal in {p} support plan.","This helps {o} work towards a goal in {p} support plan."],
 routine:["It is part of a routine that matters to {o}.","This is one of the routines {s} {vhave} kept up.","This is a routine that is important to {o}."],
 social:["It gave {o} time with people who matter to {o}.","{S} spent time with people who matter to {o}.","It meant time spent with people who matter to {o}."],
 out:["It gave {o} time out and about in the community.","{S} had time out and about in the community.","It meant time out and about in the community for {o}."],
 control:["It gave {o} choice and control over {p} day.","{S} had choice and control over how {s} spent the time.","{S} made choices and had control over how {s} spent the time."],
 confidence:["It built {p} confidence.","{S} grew in confidence doing it.","Doing it built up {p} confidence."]
};
/* a college course the person chose for the year, as ticked on their timetable */
const ENROLBANK = [
 "{S} chose {act} {r} at the start of the college year, from the courses on offer.",
 "{act2} is a course {s} picked {r} when the year's options were offered.",
 "{S} picked {act} from the courses offered at the start of the year."
];

/* Medication: the process is what the note has to show - the person was told
   what it was and what it is for, they agreed to take it, the label was
   checked against the MAR chart, it was given as prescribed, and anything
   that did not go to plan. All ticks; nothing about doses or drugs is ever
   suggested by the app. */
const MEDWORD = { morning:"{p} morning medication", lunchtime:"{p} lunchtime medication", teatime:"{p} teatime medication",
                  night:"{p} night medication", prn:"{p} when-required (PRN) medication" };
const RESP_MED = [["happy","Happy to take it"],["hesitant","Hesitant at first, then took it"]];
const MED = [["explained","Told them what the medication was and what it is for"],["label","Checked the label against the MAR chart"],
             ["water","Offered a drink to take it with"],["watched","Stayed with them until it was taken"],["prescribed","Given as prescribed"]];
const MEDBANK = {
 label:["Staff checked the label against {p} MAR chart before giving it.","The label was checked against {p} MAR chart first.","Before it was given, staff checked the label against {p} MAR chart."],
 water:["Staff offered {o} a drink to take it with.","A drink was offered to take it with.","Staff offered a drink for {o} to take it with."],
 watched:["Staff stayed with {o} until it was taken.","Staff remained with {o} until {s} had taken it.","Staff did not leave {o} until it had been taken."],
 prescribed:["The medication was given as prescribed.","It was given as prescribed.","The medication was administered as prescribed."]
};
/* told them what it was, and how - the communication methods ticked become the clause */
const MEDTELLBANK = [
 "Staff told {N} what the medication was and what it is for{tellHow}.",
 "Staff explained to {N} what the medication was and why {s} takes it{tellHow}.",
 "Before giving it, staff told {N} what it was and what it is for{tellHow}."
];
const HOWBANK_MED = {
 said:["{S} said {s} {vbe} happy to take it.","{S} told staff {s} would take it.","{S} told staff {s} {vbe} willing to take it."],
 pointed:["{S} pointed to show {s} understood.","{S} pointed to show {s} {vbe} ready to take it.","{S} responded by pointing."],
 signed:["{S} signed to show {s} would take it.","{S} signed that {s} {vbe} happy to take it.","{S} used signs to show {s} would take it."],
 nodded:["{S} nodded to show {s} would take it.","{S} nodded when asked.","{S} gave a nod when asked."],
 led:["{S} came to staff to take it.","{S} came over ready to take it.","{S} came over to staff, ready to take it."],
 reached:["{S} reached out to take it.","{S} held out {p} hand for it.","{S} put out {p} hand to take it."],
 facial:["{P} expression showed {s} {vbe} happy to take it.","{S} showed with {p} expression that {s} {vbe} happy to take it.","{S} {vbe} happy to take it, as {p} expression showed."]
};
const HOW_JOIN_MED = { said:"telling staff so", pointed:"pointing to show it", signed:"signing to show it", nodded:"nodding to show it",
                       led:"coming over to take it", reached:"reaching out for it", facial:"{p} expression making it clear" };
const MED_ISSUES = [["spat","Spat it out"],["swallow","Difficulty swallowing it"],["late","Given later than the scheduled time"],["partial","Took only part of it"]];
const MEDISSUEBANK = {
 spat:["{S} spat it out.","{S} spat the medication out.","{S} spat out the dose."],
 swallow:["{S} had difficulty swallowing it.","{S} found it difficult to swallow.","Swallowing it was difficult for {o}."],
 late:["It was given later than the scheduled time.","The medication was given later than scheduled.","It was not given until after the scheduled time."],
 partial:["{S} took only part of it.","{S} did not take all of it.","{S} took some, but not all, of it."]
};

/* how staff communicated this time; the profile only says which are usual */
const STAFFING = [["","Not stated"],["1:1","1:1"],["2:1","2:1"],["shared","Shared staffing"]];

const RISKBANK = {
 sight:["Staff remained within sight of {o} throughout.","{S} stayed within staff sight throughout.","{S} {vbe} kept within sight of staff throughout."],
 road:["Near roads, staff walked on the traffic side.","Staff walked on the traffic side near roads.","Staff kept to the traffic side when walking near roads."],
 toilet:["{S} used the toilet before leaving.","{S} went to the toilet before going out.","Before leaving, {s} used the toilet."],
 accessible:["Staff found an accessible toilet.","An accessible toilet was located by staff.","Staff located an accessible toilet."],
 space:["Staff kept {p} walking path clear.","{P} walking path was kept clear.","Staff made sure {p} walking path stayed clear."],
 plan:["The plan was explained to {o} in advance.","Staff explained the plan to {o} beforehand.","Staff talked {o} through the plan in advance."],
 seatbelt:["{S} wore a seatbelt for the journey.","{S} wore {p} seatbelt for the journey.","For the journey, {s} wore a seatbelt."],
 doortodoor:["Staff escorted {o} door to door.","{S} {vbe} escorted door to door.","Staff accompanied {o} from door to door."],
 stop:["Staff waited with {o} at the stop.","Staff and {N} waited together at the stop.","At the stop, staff waited with {o}."],
 fare:["Staff held the fare or ticket for {o}.","Staff held {p} fare or ticket.","The fare or ticket was held by staff for {o}."],
 crossing:["Staff supported {o} at crossings.","{S} {vbe} supported by staff at crossings.","At crossings, staff supported {o}."]
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
        "{S} looked pleased with {r} afterwards.","{S} appeared pleased with what {s} had done."],
 home:["{S} returned home safely and settled.",
       "{S} got home safely and settled.","{S} arrived home safely and settled."],
 later:["Support was left for now and will be offered again later.",
        "This will be offered again later.","Staff will offer this again later."],
 nightsettled:["{N} was settled in bed and comfortable.",
        "{S} {vbe} settled in bed and appeared comfortable.",
        "{S} got into bed and settled."],
 slept:["{S} settled and {vbe} asleep at the next check.",
        "{S} {vbe} asleep at the next check.","At the next check, {s} {vbe} asleep."],
 resettled:["{S} resettled without distress.",
        "{S} settled again without distress.","{S} settled back down without distress."],
 nochangeout:["The interaction finished with no concerns and {p} usual routine continued.",
              "There were no concerns and {s} carried on with {p} usual routine.","No concerns arose, and {p} usual routine carried on."],
 calmagain:["{S} settled and returned to {p} usual routine.","{S} {vbe} settled again and went back to {p} usual routine.","Once settled, {s} returned to {p} usual routine."],
 monitored:["{S} {vbe} being monitored afterwards.","Staff continued to monitor {o} afterwards.","Staff kept monitoring {o} afterwards."],
 hospital:["{S} {vbe} taken to hospital.","{S} went to hospital.","{S} attended hospital."]
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
  STAFFING, RISK_SCOPE, JOURNEY, DURING, DURINGBANK, MATCH, ENJOY, ENJOYBANK, BENEFIT, BENEFITBANK, ENROLBANK,
  COMM_CLAUSE, TELLBANK, HOWBANK_COLLEGE, HOW_JOIN_COLLEGE,
  MEDWORD, RESP_MED, MED, MEDBANK, MEDTELLBANK, HOWBANK_MED, HOW_JOIN_MED, MED_ISSUES, MEDISSUEBANK,
  WHERE, WHERE_PHRASE, ABCWORD, INCWORD, BEFORE, BEFOREBANK, STAFFDID, STAFFBANK, AFTER, AFTERBANK, IMPACT, IMPACTBANK, IMPACTWHO, IMPACTWHOBANK,
  HAPPENED, HAPPENEDBANK, INJURY, INJURYTYPE, INJURYOBS, INJURYOBSBANK, ACTIONS, ACTIONBANK
};
})(globalThis.GSN = globalThis.GSN || {});
