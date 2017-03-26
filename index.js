const app = require('http').createServer(createCallback);
const io = require('socket.io')(app);
const fs = require('fs-extra');
const bots = require('./config.json').bots;

let utterances = [];
const utteranceCount = 20;
let currUtterance = 0;

app.listen(8080);

function createCallback(req, res) {
  fs.readFile(__dirname + '/index.html', (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('ITSA BROKE');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', (socket) => {
  console.log('connected');
  socket.emit('connection');

  socket.on('submit', (data) => {
    // console.log(data);

    makeSentences(undefined, data, (out) => {
      socket.emit('nextUtterance', out);
    });
  });

  socket.on('newConvo', () => {
    generateConvo();
  });

  socket.on('nextUtterance', (data) => {
    makeSentences(undefined, data, (out) => {
      console.log(out);
      socket.emit('nextUtterance', {
        text: out
      });
    });
    // socket.emit('nextUtterance', utterances[currUtterance]);
    // currUtterance++;
  });
});

// pick two random bots and generate a bunch of utterances for them.
function generateConvo() {
  utterances = [];
  currUtterance = 0;
  const bot1 = bots[Math.floor(Math.random() * bots.length)];
  const bot2 = bots[Math.floor(Math.random() * bots.length)];

  for (let i = 0; i < utteranceCount; i++) {
    utterances.push({
      name: bot1,
      text: makeSentences(2, bot1)
    });
    utterances.push({
      name: bot2,
      text: makeSentences(2, bot2)
    });
  }

  console.log(utterances);
}

function makeSentences(sentenceCount, botIndex, callback) {
  console.log(botIndex);

  const probabilities = require(`./data/${ bots[botIndex] }-clean.json`);
  const utterance = [];

  let currSentenceCount = 0;
  if (typeof sentenceCount === 'undefined') {
    sentenceCount = Math.ceil(Math.random() * 3);
  }
  while (currSentenceCount < sentenceCount) {
    const newWord = utterance.length === 0 ? chooseFirstWord(probabilities) : chooseWordAfter(utterance[utterance.length - 1], probabilities);
    utterance.push(newWord);

    const lastChar = newWord.charAt(newWord.length - 1);
    if (lastChar === '.' || lastChar === '!' || lastChar === '?' ) {
      currSentenceCount++;
    }
  }

  let out = "";
  for (let i = 0; i < utterance.length; i++) {
    if (i > 0) {
      out += " ";
    }
    out += utterance[i];
  }

  if (callback) {
    callback(out);
  } else {
    return out;
  }
}

function chooseFirstWord(probabilities) {
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

function chooseWordAfter(word, probabilities) {
  return chooseWordFrom(probabilities[word].nextWords);
}
