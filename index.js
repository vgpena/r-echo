const botName = process.argv[2];
const wordCount = process.argv[3];
const probabilities = require(`./data/${ botName }-clean.json`);

const utterance = [];

function chooseFirstWord() {
  const wordsAndFrequencies = {};
  const words = Object.keys(probabilities);
  for (let i = 0; i < words.length; i++) {
    wordsAndFrequencies[words[i]] = probabilities[words[i]].totalFrequency;
  }
  return chooseWordFrom(wordsAndFrequencies);
}

// choose a word from an Object of form ({ "word1": "word1Count", "word2": "word2Count"})
function chooseWordFrom(wordsAndFrequencies) {
  const words = Object.keys(wordsAndFrequencies);
  const repArray = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < Number(wordsAndFrequencies[words[i]]); j++) {
      repArray.push(words[i]);
    }
  }

  const index = Math.floor(Math.random() * repArray.length);
  return repArray[index];
}

function chooseWordAfter(word) {
  return chooseWordFrom(probabilities[word].nextWords);
}

for (let i = 0; i < wordCount; i++) {
  utterance.push(i === 0 ? chooseFirstWord() : chooseWordAfter(utterance[i - 1]));
}

let out = "";
for (let i = 0; i < wordCount; i++) {
  if (i > 0) {
    out += " ";
  }
  out += utterance[i];
}
console.log(out);
