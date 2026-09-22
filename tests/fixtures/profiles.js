/* TEST PROFILES ONLY. Fictional people covering different support needs, used
   by the tests. They are never loaded by the app and are not production data. */
module.exports = {
  vision:   { initials: "TV", pronoun: "she",  flags: ["vision"], comm: ["verbal"] },
  hearing:  { initials: "TH", pronoun: "he",   flags: ["deaf"], comm: ["makaton", "gesture"] },
  choking:  { initials: "TC", pronoun: "they", flags: ["choking", "softdiet", "fluids"], comm: ["pictures"] },
  epilepsy: { initials: "TE", pronoun: "he",   flags: ["epilepsy"], comm: [] },
  diabetes: { initials: "TD", pronoun: "she",  flags: ["diabetes", "cholesterol"], comm: ["verbal"] },
  anxiety:  { initials: "TA", pronoun: "they", flags: ["anxiety", "continence"], comm: ["nownext"] },
  skin:     { initials: "TS", pronoun: "he",   flags: ["skin", "privacy"], comm: [] },
  none:     { initials: "TN", pronoun: "they", flags: [], comm: [] }
};
