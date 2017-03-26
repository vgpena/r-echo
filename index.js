const app = require('http').createServer(createCallback);
const io = require('socket.io')(app);
const fs = require('fs-extra');

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
  socket.emit('connection');

  socket.on('submit', (data) => {
    console.log(data);

    makeSentences(data.sentences, data.bot, (out) => {
      console.log(out);
    });
  });
});

function makeSentences(sentenceCount, botName, callback) {
  const probabilities = require(`./data/${ botName }-clean.json`);
  const utterance = [];

  let currSentenceCount = 0;
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

  callback(out);
}

// const botName = process.argv[2];
// const sentenceCount = process.argv[3];
// const probabilities = require(`./data/${ botName }-clean.json`);
//
// const utterance = [];

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
