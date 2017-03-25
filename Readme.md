To create a bot, add `botName.json` to /data (line-delimited JSON), and add that botname to `config.json`, then run `node createProbabilities.js`.

To generate/regenerate a specific bot, run `node createProbabilities.js <botName>`.

To request an utterance of sentence length `n` from a specific bot, run `node index.js <botName> <n>`.
