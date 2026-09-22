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
const FLAGS = [
  ["diabetes","Type 2 diabetes"], ["cholesterol","Cholesterol management"],
  ["softdiet","Soft diet"], ["choking","Choking risk"],
  ["skin","Skin integrity monitoring"], ["epilepsy","Epilepsy"],
  ["deaf","Cannot hear approaching traffic"], ["vision","Visual impairment"],
  ["continence","Continence plan"], ["anxiety","Anxiety in new places"],
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
  ["cooking","Cooking","the cooking","cooked the meal"],
  ["baking","Baking","the baking","did some baking"],
  ["shopping","Shopping","the shopping","did the shopping"],
  ["housework","Housework","the housework","did the housework"],
  ["gardening","Gardening / allotment","the gardening","worked in the garden"],
  ["walk","Walk","a walk","went for a walk"],
  ["bus","Bus ride","a bus ride","went for a bus ride"],
  ["park","Park","the park","spent time at the park"],
  ["swim","Swimming","swimming","went swimming"],
  ["cinema","Cinema","the cinema","went to the cinema"],
  ["cafe","Cafe / eating out","a cafe trip","went to the cafe"],
  ["church","Church / worship","church","went to church"],
  ["daycentre","Day centre","the day centre","attended the day centre"],
  ["volunteering","Volunteering / work placement","{p} volunteering placement","attended {p} volunteering placement"],
  ["music","Music","music","listened to music"],
  ["arts","Arts &amp; crafts","arts and crafts","did arts and crafts"],
  ["games","Games / puzzles","a game","played a game"],
  ["film","TV / film at home","a film","watched a film"],
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

const SLOTS = {
  personal:[["am","Personal Care &mdash; AM"],["pm","Personal Care &mdash; PM"],["night","Personal Care &mdash; Night"],["continence","Continence support"]],
  eating:[["breakfast","Breakfast"],["lunch","Lunch"],["dinner","Dinner"],["snack","Snack"],["fluids","Daily Fluid Intake"]],
  activity: ACTS.map(a => [a[0], a[1]])
};

/* ---------- tasks: each row mirrors a field in the care records system ---------- */
/* No default. A blank level means the row says nothing, rather than claiming
   the person did it unaided because nobody touched the dropdown. */
const LEVELS = [["","How much support?"],["ind","Did it themselves"],["prompt","With prompting"],
                ["part","Part-supported"],["full","Staff did it"],["declined","Declined"]];

const TASKS = {
personal:[
 {id:"wash",label:"Washing",nf:"Method of Hygiene",opts:["a shower","a bath","a strip wash","a bed bath","a wash at the sink"],
  ind:["{S} had {opt} independently, with staff outside the door and {p} privacy maintained.",
       "{S} managed {opt} on {p} own and needed no hands-on help.",
       "{S} completed {opt} independently while staff remained nearby in case {s} called."],
  prompt:["{S} had {opt} following step-by-step verbal prompts and completed each stage {r}.",
          "With prompts for each step, {s} washed {r} during {opt}.",
          "{S} had {opt} and needed only reminders about the order of washing."],
  part:["{S} washed {p} face and upper body {r} during {opt}, while staff gave hands-on support with the areas {s} could not reach thoroughly.",
        "During {opt}, {s} did as much as {s} could {r} and staff supported with the remaining areas.",
        "{S} had {opt}; {s} washed the parts {s} could manage and staff completed the rest to make sure {s} {vbe} thoroughly clean."],
  full:["Staff provided full hands-on support with {opt}, keeping {p} covered and explaining each step before it happened.",
        "{S} had {opt} with full support from staff, who maintained {p} privacy and dignity throughout.",
        "Staff carried out {opt} for {o}, talking {o} through each stage as they went."],
  declined:["{S} declined {opt} on this occasion and this was respected.",
            "{S} did not want {opt} and staff did not press the point."]},

 {id:"hair",label:"Hair washing",nf:"Hair Washing",
  ind:["{S} washed {p} own hair.","{S} washed and dried {p} hair without help."],
  prompt:["{S} washed {p} hair after a reminder and a demonstration.","{S} washed {p} hair {r} once staff prompted {o} to start."],
  part:["Staff helped rinse {p} hair while {s} applied the shampoo {r}.","{S} shampooed {p} hair and staff supported with rinsing and drying."],
  full:["Staff washed and dried {p} hair, checking the water temperature with {o} first.","Staff washed {p} hair for {o}, keeping the water out of {p} eyes."],
  declined:["{S} declined to have {p} hair washed today.","{S} chose not to wash {p} hair and this was respected."]},

 {id:"shave",label:"Shaving",nf:"Shaving",
  ind:["{S} shaved {r} using {p} own razor.","{S} shaved independently at the sink."],
  prompt:["{S} shaved {r} after staff set out {p} things and prompted {o} to start.","{S} shaved with verbal guidance about the areas {s} had missed."],
  part:["{S} shaved most of {p} face and staff finished the areas {s} found difficult.","Staff steadied the razor while {s} shaved, then tidied the edges."],
  full:["Staff shaved {o}, checking with {o} as they went and stopping when {s} asked.","Staff carried out {p} shave, explaining each stage beforehand."],
  declined:["{S} declined a shave today.","{S} did not want to shave and this was respected."]},

 {id:"oral",label:"Oral care",nf:"Oral Care",opts:["{p} teeth","{p} teeth with an electric toothbrush","{p} dentures"],
  ind:["{S} brushed {opt} without any support.","{S} carried out {p} own oral care, brushing {opt} thoroughly."],
  prompt:["{S} brushed {opt} following a demonstration and one reminder.","After a single prompt, {s} brushed {opt} {r}."],
  part:["{S} started brushing {opt} and staff supported to finish the back teeth.","{S} brushed {opt} and staff assisted with the areas {s} missed."],
  full:["Staff carried out oral care for {o}, brushing {opt} gently.","Staff brushed {opt} with {p} agreement."],
  declined:["{S} declined oral care on this occasion.","{S} did not want {p} teeth brushed and this was respected."]},

 {id:"nails",label:"Nail care",nf:"Nail Care",
  ind:["{S} attended to {p} own nails.","{S} cleaned and filed {p} nails {r}."],
  prompt:["{S} tended to {p} nails after a prompt from staff.","{S} filed {p} nails once staff handed {o} the file."],
  part:["Staff supported with {p} nails while {s} held out {p} hands.","{S} cleaned {p} nails and staff trimmed them."],
  full:["Staff checked and trimmed {p} nails with {p} agreement.","Staff attended to {p} nails; they were clean and a comfortable length afterwards."],
  declined:["{S} declined nail care today.","{S} did not want {p} nails done and this was respected."]},

 {id:"creams",label:"Creams",nf:"Creams Applied as per MAR chart",
  ind:["{S} applied {p} prescribed cream {r} and it was signed for on the MAR chart.",
       "{S} put on {p} own cream as prescribed; the MAR chart was signed."],
  prompt:["{S} applied {p} cream after staff prompted {o} and signed the MAR chart.",
          "Following a reminder, {s} applied {p} prescribed cream and this was signed for."],
  part:["{S} applied cream to the areas {s} could reach and staff covered the rest, as recorded on the MAR chart.",
        "Staff supported with the areas {s} could not reach; the cream was applied as prescribed and signed for."],
  full:["Staff applied {p} prescribed cream in line with the MAR chart and signed for it.",
        "Prescribed cream was applied by staff as set out on the MAR chart."],
  declined:["{S} declined {p} cream; this was recorded on the MAR chart.","{S} refused the prescribed cream and this was signed as declined."]},

 {id:"dress",label:"Dressing & clothing choice",nf:"Choice of clothing made?",
  ind:["{S} chose {p} own clothes and dressed without help.","{S} picked out {p} outfit and dressed {r}."],
  prompt:["{S} chose between two clean, weather-appropriate outfits and dressed {r} with verbal prompts for the order.",
          "{S} selected {p} clothes from two options and dressed following prompts."],
  part:["{S} chose between two clean outfits and dressed {p} top half {r}, with staff supporting with {p} lower half.",
        "{S} chose {p} clothes and staff helped with fastenings and footwear."],
  full:["Staff showed {o} two clean outfits, {s} indicated a preference, and staff dressed {o} in {p} choice.",
        "Staff supported {o} to dress in the outfit {s} chose from two options."],
  declined:["{S} declined to change {p} clothes at this point.","{S} kept the clothes {s} {vbe} wearing by choice."]},

 {id:"continence",label:"Continence support",nf:"Continence chart",
  ind:["{S} used the toilet independently.","{S} took {r} to the toilet without support."],
  prompt:["{S} used the toilet after a prompt from staff.","Staff reminded {o} and {s} used the toilet {r}."],
  part:["Staff supported {o} to the toilet and gave hands-on help with clothing only.","{S} {vbe} supported to the toilet; staff assisted with clothing and hand washing."],
  full:["Staff provided full continence support in private, in line with {p} support plan.","Continence support was given by staff, with {p} dignity and privacy maintained."],
  declined:["{S} declined support with the toilet at this time.","{S} did not want support and this was respected."]},

 {id:"hearing",label:"Hearing aids",nf:"Hearing Aid(s)",
  ind:["{S} put in {p} hearing aids {r}.","{S} fitted {p} own hearing aids and checked they were working."],
  prompt:["{S} put in {p} hearing aids after a reminder.","A prompt was given and {s} fitted {p} hearing aids."],
  part:["Staff supported {o} to fit {p} hearing aids and checked they were working.","{S} held the aids and staff helped fit them correctly."],
  full:["Staff fitted and checked {p} hearing aids.","{P} hearing aids were cleaned, fitted and checked by staff."],
  declined:["{S} declined to wear {p} hearing aids today.","{S} chose not to wear {p} hearing aids."]},

 {id:"glasses",label:"Glasses / lenses",nf:"Glasses / Contact Lenses",
  ind:["{S} put on {p} glasses {r}.","{S} chose to wear {p} glasses and put them on without help."],
  prompt:["{S} put on {p} glasses once staff handed them to {o}.","{S} wore {p} glasses after a prompt."],
  part:["Staff cleaned {p} glasses and {s} put them on.","{P} glasses were cleaned by staff and {s} put them on {r}."],
  full:["Staff cleaned {p} glasses and helped {o} to put them on.","Staff fitted {p} glasses for {o} after cleaning them."],
  declined:["{S} declined to wear {p} glasses today.","{S} chose not to wear {p} glasses."]},

 {id:"aids",label:"Assistive aids",nf:"Assistive Aids Checked, Cleaned & Issued",
  ind:["{S} collected and used {p} own equipment.","{S} checked and used {p} aid without support."],
  prompt:["{S} used {p} equipment after staff prompted {o} to collect it.","Staff reminded {o} and {s} used {p} aid correctly."],
  part:["Staff checked and cleaned {p} equipment before {s} used it.","{P} aid was checked and cleaned by staff, then used by {o}."],
  full:["Staff checked, cleaned and issued {p} equipment before use.","{P} assistive equipment was checked, cleaned and set up by staff."],
  declined:["{S} declined to use {p} equipment on this occasion.","{S} chose not to use {p} aid."]},

 {id:"jewellery",label:"Watch & jewellery",nf:"Watch & Jewellery",
  ind:["{S} chose and put on {p} own watch and jewellery.","{S} selected the jewellery {s} wanted to wear."],
  prompt:["{S} put on {p} watch after a prompt.","Staff offered {o} {p} jewellery and {s} put it on {r}."],
  part:["Staff fastened {p} watch after {s} chose it.","{S} chose {p} jewellery and staff helped fasten it."],
  full:["Staff put on the watch and jewellery {s} chose.","Staff fitted {p} chosen jewellery for {o}."],
  declined:["{S} chose not to wear jewellery today.","{S} declined {p} watch and jewellery."]},

 {id:"nightwear",label:"Night clothes",nf:"Choice of clothing made?",
  ind:["{S} chose {p} night clothes and changed independently.","{S} got changed for bed without any help."],
  prompt:["{S} changed into {p} night clothes after a prompt.","Staff offered {o} two sets of night clothes and {s} changed {r}."],
  part:["{S} changed {p} top half {r} and staff supported with the rest.","Staff supported {o} to change into the night clothes {s} chose."],
  full:["Staff supported {o} to change into {p} night clothes, keeping {o} covered throughout.","Staff changed {o} into the night clothes {s} chose, maintaining {p} dignity."],
  declined:["{S} preferred to stay in what {s} was wearing and this was respected.","{S} declined to change for bed."]},

 {id:"reposition",label:"Repositioning",nf:"Repositioning chart",
  ind:["{S} repositioned {r} comfortably in bed.","{S} moved {r} into a comfortable position."],
  prompt:["{S} repositioned {r} after a prompt from staff.","Staff prompted {o} and {s} shifted position {r}."],
  part:["Staff supported {o} to reposition, following {p} lead on what felt comfortable.","{S} was helped to change position and said {s} was comfortable afterwards."],
  full:["Staff repositioned {o} in line with {p} repositioning plan and recorded the position.","Staff changed {p} position as set out in {p} support plan; {s} appeared comfortable."],
  declined:["{S} did not want to be repositioned and this was respected.","{S} declined repositioning at this time."]},

 {id:"settle",label:"Settling for the night",nf:"Daily note",
  ind:["{S} took {r} to bed when {s} was ready.","{S} decided when to go to bed and settled independently."],
  prompt:["{S} went to bed after a reminder about the time.","A prompt was given and {S} settled down for the night."],
  part:["Staff supported {o} to get into bed and settled {o} with {p} usual things nearby.","{S} was supported into bed, with {p} light and door left as {s} prefers."],
  full:["Staff supported {o} fully to settle into bed and left the room as {s} prefers it.","Staff settled {o} for the night, following {p} usual bedtime routine."],
  declined:["{S} was not ready for bed and chose to stay up; this was respected.","{S} declined to settle at this point and staff did not press the point."]},

 {id:"sleepcheck",label:"Night check",nf:"Night checks",
  ind:["{S} was awake and told staff {s} was fine.","{S} was awake, settled, and said {s} did not need anything."],
  prompt:["{S} was checked and needed only reassurance before settling again.","A brief word from staff was enough for {o} to settle again."],
  part:["Staff checked on {o} and gave the support {s} asked for before {s} settled.","{S} was checked and supported back to sleep."],
  full:["Staff carried out the agreed night check; {S} was asleep and breathing comfortably.","A night check was completed as per {p} support plan; {S} was asleep and settled."],
  declined:["{S} asked not to be disturbed and staff observed from the doorway only.","{S} did not want staff to come in; a discreet check was made instead."]},

 {id:"makeup",label:"Make up",nf:"Make Up",
  ind:["{S} applied {p} own make up.","{S} did {p} make up without support."],
  prompt:["{S} applied {p} make up after staff set it out for {o}.","{S} did {p} make up following a prompt."],
  part:["{S} applied most of {p} make up and staff supported to finish.","Staff steadied the mirror while {s} applied {p} make up."],
  full:["Staff applied {p} make up the way {s} asked for it.","Staff did {p} make up to {p} preference."],
  declined:["{S} declined make up today.","{S} chose not to wear make up."]}
],

eating:[
 {id:"choose",label:"Choosing the meal",nf:"Choices Offered",
  ind:["{S} decided what {s} wanted without any help.","{S} chose {p} meal independently."],
  prompt:["{S} chose after staff talked through the options with {o}.","Staff described the options and {s} made {p} choice."],
  part:["Staff showed {o} both options side by side and {s} indicated {p} preference.","{S} {vbe} shown both meals and chose the one {s} wanted."],
  full:["Staff offered two options and {s} responded to the one {s} preferred.","Both options were presented and {P} response was followed."],
  declined:["{S} did not want to choose a meal at this point.","{S} declined both options offered."]},

 {id:"prep",label:"Preparing the meal",nf:"Daily note",
  ind:["{S} gathered the ingredients and prepared the meal {r}.","{S} made the meal independently from start to finish."],
  prompt:["{S} prepared the meal with verbal guidance about order and timings.","{S} cooked the meal following prompts at each stage."],
  part:["{S} completed most of the preparation and staff supported with the hot pans.","{S} prepared what {s} could safely manage and staff did the rest."],
  full:["Staff prepared the meal while {s} watched and chose the seasoning.","Staff cooked the meal, involving {o} in the choices along the way."],
  declined:["{S} did not want to help prepare the meal today.","{S} declined to take part in preparing the meal."]},

 {id:"eat",label:"Eating",nf:"Amount Eaten (%)",
  ind:["{S} ate independently and stayed settled at the table.","{S} ate the meal without any support."],
  prompt:["{S} ate independently with occasional encouragement, offered without pressure.","{S} needed a gentle reminder to keep going and finished the meal {r}."],
  part:["{S} ate most of the meal {r} and staff supported with cutting up the food.","Staff helped with cutting and {s} ate the meal {r}."],
  full:["Staff supported {o} to eat at {p} own pace, following {p} lead on each mouthful.","Staff assisted {o} with eating, pausing whenever {s} indicated."],
  declined:["{S} declined the meal and this was respected.","{S} did not want to eat at this time."]},

 {id:"drink",label:"Drinking",nf:"Daily Fluid Intake",
  ind:["{S} poured and drank {p} own drink.","{S} got {r} a drink without support."],
  prompt:["{S} drank after being offered and reminded.","A drink was offered and {s} took it after a prompt."],
  part:["Staff poured the drink {s} chose and {s} drank it {r}.","{S} chose {p} drink and staff poured it for {o}."],
  full:["Staff supported {o} with {p} drink at {p} own pace.","Staff assisted {o} to drink, following {p} pace."],
  declined:["{S} declined a drink at this point; it was offered again later.","{S} did not want a drink and this was respected."]}
],

activity:[
 {id:"plan",label:"Planning &amp; preparing",nf:"Daily note",
  ind:["{S} got everything ready for {act} without any help.","{S} prepared for {act} independently."],
  prompt:["Staff talked through the plan for {act} and {s} got ready with prompts.","{S} got ready for {act} after staff explained what would happen."],
  part:["Staff explained the plan for {act} and supported {o} to get ready.","{S} got ready for {act} with hands-on support from staff."],
  full:["Staff prepared everything for {act} and talked {o} through what was going to happen.","Staff got things ready and explained each step of {act} to {o} beforehand."],
  declined:["{S} declined {act} at the planning stage.","{S} did not want to go ahead with {act} and this was respected."]},

 {id:"travel",label:"Travelling there",nf:"Daily note",
  opts:["by cab","by bus","by train","on foot","in the staff vehicle","by minibus"],
  ind:["{S} travelled {opt} independently and managed the journey well.","{S} made {p} own way there {opt} without support."],
  prompt:["{S} travelled {opt} with staff nearby and needed only occasional guidance.","Staff travelled {opt} alongside {o} and gave guidance where it was needed."],
  part:["{S} travelled {opt} with staff support and stayed settled for the journey.","Staff supported {o} {opt} throughout the journey; {s} remained calm."],
  full:["Staff supported {o} closely {opt} throughout the journey, in line with {p} assessed arrangements.","{S} travelled {opt} and {vbe} supported throughout as set out in {p} risk assessment."],
  declined:["{S} declined to travel today.","{S} chose not to go out and this was respected."]},

 {id:"engage",label:"Taking part",nf:"Daily note",
  ind:["{S} {did} without any support.","{S} {did} on {p} own and set {p} own pace.","{S} {did} independently and kept going until {s} had finished."],
  prompt:["{S} {did} and needed one gentle prompt to return to the task when {s} became distracted.","{S} {did} with occasional prompts from staff to refocus.","{S} {did} following a prompt at each stage."],
  part:["{S} {did} with verbal and visual guidance from staff.","Staff guided {o} through {act} step by step and {s} completed it.","{S} did as much of {act} as {s} could and staff supported with the rest."],
  full:["Staff supported {o} throughout {act}, following {p} lead on how long to stay.","{S} {vbe} supported throughout {act} and staff worked at {p} pace."],
  declined:["{S} chose not to take part once {s} arrived, and this was respected.","{S} declined {act} and staff did not press the point."]},

 {id:"tools",label:"Using equipment",nf:"Daily note",
  ind:["{S} used the equipment safely and without supervision.","{S} set up and used the equipment {r}, following the steps {s} knows well."],
  prompt:["{S} used the equipment after staff prompted {o} through the steps.","Staff reminded {o} of the steps and {s} used the equipment safely."],
  part:["Staff set the equipment up and {s} used it with supervision.","{S} used the equipment with staff supervising for safety."],
  full:["Staff operated the equipment while {s} watched and made the choices.","Staff handled the equipment for safety reasons and kept {o} involved in each decision."],
  declined:["{S} did not want to use the equipment today.","{S} declined to use the equipment and this was respected."]},

 {id:"money",label:"Money &amp; paying",nf:"Daily note",
  ind:["{S} paid {r} and checked {p} change.","{S} handled {p} own money and paid independently."],
  prompt:["{S} paid after a prompt about the amount.","Staff reminded {o} of the amount and {s} paid {r}."],
  part:["Staff counted out the money with {o} and {s} handed it over.","{S} paid with staff support to count the money."],
  full:["Staff handled the payment and showed {o} the receipt afterwards.","Payment was made by staff, with {p} money recorded as per the finance procedure."],
  declined:["{S} did not want to handle money today.","{S} declined to pay and this was respected."]},

 {id:"tidy",label:"Clearing up afterwards",nf:"Daily note",
  ind:["{S} cleared up afterwards without being asked.","{S} tidied away independently once {s} had finished."],
  prompt:["{S} cleared up after a reminder from staff.","A prompt was given and {s} tidied away {r}."],
  part:["{S} cleared up with staff working alongside {o}.","Staff and {N} cleared up together afterwards."],
  full:["Staff cleared up afterwards while {s} rested.","Clearing up was done by staff as {s} had had enough for the day."],
  declined:["{S} did not want to clear up today.","{S} declined to help tidy away and this was respected."]},

 {id:"finish",label:"Finishing &amp; coming home",nf:"Daily note",
  ind:["{S} decided when {s} had had enough and finished {r}.","{S} chose when to stop and made {p} own way back."],
  prompt:["{S} chose to stop when the agreed time was finished.","{S} finished at the agreed time after a reminder."],
  part:["Staff let {o} know the time was nearly up and {s} agreed to finish.","{S} {vbe} given notice that it was time to go and agreed to leave."],
  full:["Staff brought {act} to a close and supported {o} home.","Staff ended the session and supported {o} to return home safely."],
  declined:["{S} wanted to stay longer; staff explained why it was time to go and {s} accepted this.","{S} {vbe} reluctant to finish and staff gave {o} extra time."]}
]};

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
  skill:["{S} practised the skill {s} has been working on and staff saw steady progress.",
         "{S} worked on the skill {s} is building and managed more of it {r} than last time."],
  instructions:["{S} listened to the tutor and followed the instructions given.",
                "{S} took direction from the tutor and carried out each step as asked."],
  alongside:["{S} worked alongside the other learners without difficulty.",
             "{S} shared the space and the work with others and settled in well."],
  conversation:["{S} talked with peers and staff during the session.",
                "{S} joined in conversation with others and seemed comfortable doing so."],
  turn:["{S} waited {p} turn and shared the equipment with others.",
        "{S} took turns with the others and gave up the equipment when asked."],
  askedhelp:["{S} asked for help when {s} needed it rather than giving up.",
             "{S} let staff know when {s} was stuck, which is something {s} is working on."],
  safe:["{S} used the tools and equipment safely throughout.",
        "{S} handled the equipment safely and followed the safety instructions given."],
  finished:["{S} finished a piece of work and took it home.",
            "{S} completed what {s} had started before the session ended."],
  pride:["{S} was visibly pleased with what {s} had produced and showed it to staff.",
         "{S} showed pride in {p} work and wanted others to see it."],
  change:["A change to the usual plan was explained and {S} managed it without distress.",
          "{S} coped well with the session running differently from usual."]
};

/* safeguarding on the journey belongs with the journey, not after the class */
const TRAVEL_RISK = ["seatbelt","doortodoor","stop","fare","crossing","road"];

const OPEN_COLLEGE = [
  "{N} attended {act} at college at {time}.",
  "At {time}, staff supported {N} to attend {act} at college.",
  "{N} was supported to attend {act} at college at {time}.",
  "Staff supported {N} to college at {time} for {act}.",
  "{N} went to college at {time} for {act}.",
  "Staff escorted {N} to college at {time} for {act}.",
  "{N} attended college at {time} for {act}."
];

const OPEN_ACT = {
 choice:[
  "{N} was offered a choice of activity at {time}.",
  "At {time}, staff offered {N} a choice of what to do{ratio}.",
  "Staff sat with {N} at {time} to talk through the options for the day.",
  "{N} was offered two options at {time} and given time to decide."],
 single:[
  "{N} was offered {offer} at {time}.",
  "At {time}, staff offered {N} {offer}{ratio}.",
  "{Offer} was offered to {N} at {time}, with the plan explained in advance.",
  "Staff offered {N} {offer} at {time} and explained what it would involve.",
  "{N} was offered {offer} at {time} and given time to decide."]
};

/* personal care reads differently at 07:00 and at 22:00 */
const OPEN_PC = {
 pm:[
  "{N} was offered support with {p} personal care at {time}, ahead of the evening.",
  "At {time}, staff offered {N} support with {p} evening personal care{ratio}.",
  "Evening personal care was offered to {N} at {time}.",
  "{N} was asked at {time} whether {s} wanted support to get ready for the evening."],
 night:[
  "{N} was supported with {p} night routine at {time}.",
  "At {time}, staff offered {N} support to get ready for bed{ratio}.",
  "Support to settle for the night was offered to {N} at {time}.",
  "{N} was approached at {time} and offered support with {p} night-time routine.",
  "Staff checked on {N} at {time} as part of {p} agreed night support."],
 continence:[
  "{N} was offered continence support at {time}.",
  "At {time}, staff offered {N} support with {p} personal hygiene{ratio}.",
  "Continence support was offered to {N} at {time}, in line with {p} support plan."]
};

const OPEN = {
personal:[
 "{N} was offered support with {p} personal care at {time}.",
 "At {time}, staff offered {N} support with {p} personal care{ratio}.",
 "Support with personal care was offered to {N} at {time}, while {s} {vbe} settled.",
 "{N} was approached at {time} and offered support with {p} personal care routine.",
 "Personal care was offered to {N} at {time}, early enough in the day to suit {p} usual routine."],
eating:[
 "{N} was offered {meal} at {time}.",
 "At {time}, staff offered {N} {meal}{ratio}.",
 "{meal2} was offered to {N} at {time}.",
 "{N} was invited to {meal} at {time} and came to the table.",
 "Staff offered {N} {meal} at {time} and talked through what was available."],
activity:[
 "{N} was offered a choice of activity at {time}.",
 "At {time}, staff offered {N} a choice of what to do{ratio}.",
 "{N} was offered {act} at {time}, alongside another option.",
 "Staff sat with {N} at {time} to talk through the options for the day.",
 "{act2} was offered to {N} at {time}, with the plan explained in advance."]
};

const COMMBANK = {
 verbal:["Staff used short, clear sentences and allowed time for {o} to respond.",
         "Staff spoke in simple, calm language and gave {o} time to answer.",
         "Staff kept the language simple and waited for {p} reply without rushing {o}."],
 makaton:["Staff gained {p} attention, faced {o} directly and used Makaton alongside speech.",
          "Makaton signs were used with speech and {s} {vbe} given time to respond.",
          "Staff signed each step in Makaton and checked {s} had understood before continuing."],
 pictures:["Staff used {p} picture-based communication book, showing a picture for each step.",
           "Pictures were used so {s} could see each option before choosing.",
           "Staff showed {o} pictures for each part of the routine and waited for {p} response."],
 nownext:["Staff used a Now and Next prompt so {s} knew what was coming.",
          "A Now and Next board was used and {s} {vbe} given time to process the information.",
          "Staff set out the sequence on {p} Now and Next board before starting."],
 objects:["Staff used objects of reference and gave {o} time to respond.",
          "Objects of reference were used so {s} could see what was being offered."],
 gesture:["Staff watched {p} body language closely and responded to the cues {s} gave.",
          "Staff read {p} gestures and expressions and followed {p} lead."]
};

const RESPBANK = {
 choseA:["{S} chose {chosen}.","{S} indicated {chosen}.","{S} picked {chosen} from the two options."],
 choseB:["{S} chose {chosen}.","{S} went for {chosen}.","{S} selected {chosen} once both options had been shown."],
 agreed:["{S} agreed to the support that was offered.","{S} {vbe} happy to go ahead.","{S} accepted the offer."],
 nonverbal:["{S} gave a clear non-verbal response and staff followed {p} lead.",
            "{S} made {p} preference clear without words and this was acted on.",
            "{S} showed {p} choice non-verbally and staff responded to it."],
 delayed:["{S} declined at first. {declined} {s} then agreed and support went ahead.",
          "{S} said no to begin with. {declined} On the second offer {s} agreed."],
 declined:["{S} declined. {declined}","{S} did not want to go ahead. {declined}"],
 keen:["{S} was ready on time and keen to go.","{S} was looking forward to it and ready to leave on time."],
 agreedgo:["{S} agreed to go and got ready in good time.","{S} was happy to attend and got {r} ready."],
 encouraged:["{S} needed some encouragement to set off; staff allowed extra time and {s} agreed to go.",
             "{S} was slow to get going, and staff encouraged {o} without pressure until {s} was ready."],
 reluctant:["{S} was reluctant to go at first. {declined} {S} then agreed to attend.",
            "{S} did not want to go to begin with. {declined} {S} changed {p} mind and attended."],
 declinedgo:["{S} declined to attend today. {declined}","{S} chose not to go to college today. {declined}"],
 noresp:["{S} did not give a clear response, so staff waited and offered again a short time later.",
         "No clear response was given; staff allowed more time rather than pressing on."]
};

const HOWBANK = {
 said:["{S} told staff what {s} wanted.","{S} said so in {p} own words."],
 pointed:["{S} pointed to {p} choice.","{S} made {p} choice by pointing."],
 signed:["{S} signed {p} choice.","{S} used Makaton to show what {s} wanted."],
 nodded:["{S} nodded to show {p} choice.","{S} nodded when the option {s} wanted was offered."],
 led:["{S} led staff to what {s} wanted.","{S} took staff to {p} choice."],
 reached:["{S} reached for the option {s} wanted.","{S} reached out towards {p} choice."],
 facial:["{P} facial expression made {p} preference clear.","Staff read {p} expression and followed {p} preference."]
};

const CONSENTBANK = {
 yes:["Consent was obtained before any support began.","{S} gave consent before support started.","Consent was checked and given before staff began."],
 implied:["{S} cooperated throughout and consent was implied by {p} response.","Consent was implied through {p} cooperation and body language."],
 no:["Consent was not given and no support was carried out.","{S} did not consent and staff did not proceed."]
};

const SKINBANK = {
 clear:["{P} skin was observed during care and no new redness, bruising, scratches or broken areas were seen.",
        "Staff observed {p} skin throughout and it appeared intact with no new concerns.",
        "{P} skin was checked during personal care and looked the same as usual."],
 concern:["A new mark was seen during care &mdash; {skinDetail}. This has been recorded on the body map and handed over.",
          "During care staff noticed {skinDetail}; this is on the body map and has been passed on.",
          "{skinDetail} was observed during care, recorded on the body map and reported."]
};

const MOODBANK = {
 settled:["{S} remained settled throughout.","{S} stayed calm and settled from start to finish."],
 cheerful:["{S} {vbe} cheerful and smiled during the interaction.","{S} seemed in good spirits throughout."],
 quiet:["{S} {vbe} quieter than usual but showed no signs of distress.","{S} {vbe} quiet throughout; there were no signs {s} {vbe} unhappy."],
 chatty:["{S} chatted with staff throughout.","{S} {vbe} talkative and engaged with staff."],
 tired:["{S} appeared tired but took part willingly.","{S} seemed tired, so staff worked at {p} pace."],
 anxious:["{S} appeared anxious at the start; staff slowed down and {s} settled.","{S} showed some anxiety and staff gave {o} more time and reassurance."],
 unsettled:["{S} {vbe} unsettled at points; staff gave {o} space and {s} calmed.","{S} became unsettled and staff paused until {s} {vbe} ready to continue."]
};

const WELLBANK = {
 nochange:["No change from {p} usual presentation, appetite or energy was observed.",
           "Nothing was different from {p} usual self.",
           "{S} presented as usual with no change in appetite, energy or mood."],
 appetite:["{P} appetite was different from usual today and this has been handed over."],
 pain:["{S} showed signs of discomfort during the interaction; this has been reported."],
 cough:["{S} coughed during the interaction and staff monitored {o} closely afterwards."],
 sleep:["{S} reported sleeping poorly and seemed tired as a result."]
};

const RISKBANK = {
 sight:["Staff remained within sight of {o} throughout.","{S} stayed within staff sight for the whole time."],
 road:["Near roads, staff gained {p} attention and walked on the traffic side.","Staff walked on the traffic side and used visual prompts at every crossing."],
 toilet:["{S} used the toilet before leaving, in line with {p} continence plan."],
 accessible:["Staff identified an accessible toilet on arrival."],
 space:["Staff kept {p} walking path clear and avoided blocking shared items."],
 plan:["The plan and the leaving time were explained to {o} in advance."],
 seatbelt:["{S} wore a seatbelt for the whole journey.","Staff checked {p} seatbelt was fastened before setting off."],
 doortodoor:["Staff escorted {o} door to door and handed over to the tutor on arrival.",
             "{S} was escorted from the door of the house to the door of the venue."],
 stop:["Staff waited with {o} at the stop until the bus arrived.","{S} was not left alone while waiting for transport."],
 fare:["Staff held the fare and ticket on {p} behalf, as agreed in {p} support plan."],
 crossing:["Staff supported {o} at every crossing and waited for the signal together."]
};

const OUTBANK = {
 ready:["{N} was clean, comfortable and ready for the day.",
        "{S} {vbe} clean, dressed and comfortable afterwards.",
        "{N} finished clean, comfortable and ready to start {p} day."],
 settled:["{S} {vbe} settled afterwards and moved on to the rest of {p} day.",
          "{S} remained settled once the interaction had finished.",
          "{S} {vbe} calm and settled at the end."],
 enjoyed:["{S} said {s} had enjoyed it and would like to do it again.",
          "{S} made it clear {s} had enjoyed the time and wanted to go again.",
          "{S} showed {s} had enjoyed it and asked about doing it again."],
 proud:["{S} seemed pleased with what {s} had done.",
        "{S} looked pleased with {r} afterwards."],
 home:["{S} returned home safely and settled without distress.",
       "{S} got home safely and settled straight away."],
 later:["Support was left for now and will be offered again later in the shift.",
        "This will be offered again later; {p} decision was respected."],
 nightsettled:["{N} settled in bed and was comfortable when staff left the room.",
        "{S} {vbe} settled in bed and appeared comfortable.",
        "{S} got into bed and settled without distress."],
 slept:["{S} settled quickly and was asleep at the next check.",
        "{S} {vbe} asleep when staff checked a short time later.",
        "{S} fell asleep soon afterwards and slept through the rest of the check period."],
 resettled:["{S} {vbe} resettled without distress and stayed comfortable afterwards.",
        "Staff resettled {o} and {s} went back to sleep.",
        "{S} settled again with reassurance and remained comfortable."],
 nochangeout:["The interaction finished with no concerns and {p} usual routine continued.",
              "There were no concerns and {s} carried on with {p} usual routine."]
};

const MEALWORD = {breakfast:["breakfast","Breakfast"],lunch:["lunch","Lunch"],dinner:["{p} evening meal","The evening meal"],
                  snack:["a snack","A snack"],fluids:["a drink","A drink"]};

const DAYS = [["1","Monday"],["2","Tuesday"],["3","Wednesday"],["4","Thursday"],
              ["5","Friday"],["6","Saturday"],["0","Sunday"]];

G.data = {
  COMM, FLAGS, RESP, HOW, CONSENT, SKIN, MOOD, WELL, RISK, OUTCOME, ACTS, OUT_SCOPE, SLOTS, LEVELS, TASKS, ACT_SETTING, COURSES, RESP_COLLEGE, RESP_SCOPE, LEARN, LEARNBANK, TRAVEL_RISK, OPEN_COLLEGE, OPEN_ACT, OPEN_PC, OPEN, COMMBANK, RESPBANK, HOWBANK, CONSENTBANK, SKINBANK, MOODBANK, WELLBANK, RISKBANK, OUTBANK, MEALWORD, DAYS
};
})(globalThis.GSN = globalThis.GSN || {});
