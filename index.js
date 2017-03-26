const app = require('http').createServer(createCallback);
const io = require('socket.io')(app);
const fs = require('fs-extra');
const bots = require(`${ __dirname }/config.json`).bots;

let utterances = [];
const utteranceCount = 20;
let currUtterance = 0;
let currentUtteranceOrderedWords = [];
let currLogFile = '';
const mustMatchChars = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['<', '>'],
];

app.listen(8080);
startNewLogFile();

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
    makeSentences(undefined, data, (out) => {
      console.log(out);
      fs.appendFile(currLogFile, `
## ${ bots[data] }

${ out }

`, 'utf8');

      socket.emit('nextUtterance', out);
    });
  });

  socket.on('newConvo', () => {
    newConvo();
  });

  socket.on('nextUtterance', (data) => {
    makeSentences(undefined, data, (out) => {
      console.log(out);
      fs.appendFile(currLogFile, `
## ${ bots[data] }

${ out }

`, 'utf8');

      socket.emit('nextUtterance', {
        text: out
      });
    });
  });
});

function startNewLogFile() {
  currLogFile = `${ __dirname }/logs/${ new Date() }.md`;
  console.log(currLogFile);
  fs.open(currLogFile, 'w', (err) => {
    if (err) {
      console.log(err);
    }
  });
}

function newConvo() {
  utterances = [];
  currentUtteranceOrderedWords = [];
  fs.appendFile(currLogFile, '\n\n----------------\n\n', 'utf8');
}

// pick two random bots and generate a bunch of utterances for them.
function generateConvo() {
  utterances = [];
  currentUtteranceOrderedWords = [];
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

function scoreWords(utterance, corpus) {
  const wordsAndFrequencies = [];
  currentUtteranceOrderedWords = [];
  const minNextWords = Object.keys(corpus).length * .0005;
  for (let i = 0; i < utterance.length; i++) {
    if (Object.keys(corpus[utterance[i]].nextWords).length > minNextWords && corpus[utterance[i]].totalFrequency > minNextWords * 2) {
      wordsAndFrequencies.push({
        word: utterance[i],
        frequency: corpus[utterance[i]].totalFrequency,
      });
    }
  }
  wordsAndFrequencies.sort((a, b) => {
    return a.frequency - b.frequency;
  });
  for (let i = 0; i < wordsAndFrequencies.length; i++) {
    currentUtteranceOrderedWords.push(wordsAndFrequencies[i].word);
  }
}

function stripOutUnmatchedCharacters(utterance, openChar, closeChar) {
  let out = '';
  let openCharSeen = 0;
  utterance = utterance.split('');
  for (let i = 0; i < utterance.length; i++) {
    const nextChar = utterance[i];
    if (nextChar.localeCompare(openChar) !== 0 && nextChar.localeCompare(closeChar) !== 0) {
      out += utterance[i];
    } else if (nextChar.localeCompare(openChar) === 0) {
      out += utterance[i];
      openCharSeen++;
    } else if (nextChar.localeCompare(closeChar) === 0) {
      if (openCharSeen > 0) {
        out += utterance[i];
        openCharSeen--;
      }
    }
  }
  while (openCharSeen > 0) {
    const i = out.lastIndexOf(openChar);
    out = out.slice(0, i) + out.slice(i + 1, out.length);
    openCharSeen--;
  }
  return out;
  // for (let i = 0; i < mustMatchChars.length; i++) {
  //   const openChar = mustMatchChars[i][0];
  //   const closeChar = mustMatchChars[i][1];
  // }
}

function cleanUtterance(utterance) {
  let cleaned = utterance.replace(/\uFFFD|'&nbsp;'|\n/g, '');
  for (let i = 0; i < mustMatchChars.length; i++) {
    cleaned = stripOutUnmatchedCharacters(cleaned, mustMatchChars[i][0], mustMatchChars[i][1]);
  }
  return cleaned;
}

function makeSentences(sentenceCount, botIndex, callback) {
  console.log(botIndex);

  const probabilities = require(`${ __dirname }/data/${ bots[botIndex] }-clean.json`);
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

  scoreWords(utterance, probabilities);

  if (callback) {
    callback(cleanUtterance(out));
  } else {
    return cleanUtterance(out);
  }
}

function chooseFirstWord(probabilities) {
  const wordsAndFrequencies = {};
  const words = Object.keys(probabilities);

  if (currentUtteranceOrderedWords.length > 0) {
    for (let i = 0; i < currentUtteranceOrderedWords.length; i++) {
      if (words.indexOf(currentUtteranceOrderedWords[i]) >= 0) {
        if (Math.random() > 0.5) {
          return currentUtteranceOrderedWords[i];
        }
      }
    }
  }

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
