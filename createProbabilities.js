const fs = require('fs-extra');
const ndjson = require('ndjson');

const config = require('./config.json');
const bots = config.bots;

function createProbabilities(data) {
  let probs = {};
  for (let i = 0; i < data.length; i++) {
    if (!probs[data[i].word]) {
      probs[data[i].word] = {
        totalFrequency: 0,
        nextWords: {},
      }
    }
    probs[data[i].word].nextWords[data[i].nextword] = Number(data[i].c);
  }
  // remove all words from 'nextWords' that aren't part of top-level data
  // and add the remaining numbers together to give total frequency.
  const topLevel = Object.keys(probs);
  for (let i = 0; i < topLevel.length; i++) {
    const word = topLevel[i];
    const nextWordsKeep = {};
    const nextWords = Object.keys(probs[word].nextWords);
    for (let j = 0; j < nextWords.length; j++) {
      if (topLevel.indexOf(nextWords[j]) > -1) {
        nextWordsKeep[nextWords[j]] = probs[word].nextWords[nextWords[j]];
      }
    }
    probs[word].nextWords = nextWordsKeep;
    const nextWordsKeepArr = Object.keys(nextWordsKeep);
    for (let j = 0; j < nextWordsKeepArr.length; j++) {
      const nextWord = nextWordsKeepArr[j];
      probs[word].totalFrequency += Number(nextWordsKeep[nextWordsKeepArr[j]]);
    }
  }
  return probs;
}

function createBot(botName) {
  const dataObj = [];
  const stream = fs.createReadStream(`./data/${ botName }.json`).pipe(ndjson.parse());
  stream.on('data', (dataRaw) => {
    dataObj.push(dataRaw);
  });
  stream.on('end', () => {
    // remove any rows where current and next word are the same
    const data = dataObj.filter((row, index) => {
      return row.word.localeCompare(row.nextword) !== 0;
    });
    const probabilities = createProbabilities(data);
    fs.writeFile(`./data/${ botName }-clean.json`, JSON.stringify(probabilities), 'utf8', (err) => {
      if (err) {
        throw new Error(err);
      }
    });
  });
}

for (let i = 0; i < bots.length; i++) {
  createBot(bots[i]);
}
