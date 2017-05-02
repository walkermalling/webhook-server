const express = require('express');
const bodyParser = require('body-parser');

const BRANCH_NAME = '';
const PORT = 4073;

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
  /* eslint-disable no-param-reassign */
  res.locals.event = req.get('X-GitHub-Event');
  res.locals.signature = req.get('X-Hub-Signature');
  res.locals.id = req.get('X-GitHub-Delivery');

  if (req.body.ref.indexOf(BRANCH_NAME) === -1) {
    res.status(204).send('no action taken');
    return;
  }

  if (res.locals.event === 'push') {
    next();
    return;
  }

  if (res.locals.event === 'pull_request' &&
      req.body.action === 'closed' &&
      req.body.pull_request.merged === true) {
    next();
    return;
  }

  // TODO check signature

  res.status(204).send('no action taken');
  /* eslint-enable no-param-reassign */
});

app.post('/webhook', (req, res) => {
  res.status(204).send('ok');
});

app.use((req, res) => {
  res.status(404).send('404');
});

app.listen(PORT, () => {
  process.stdout.write(`Webhook Service listening on port ${PORT}`);
});
