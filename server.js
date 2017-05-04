const express = require('express');
const bodyParser = require('body-parser');
const execFile = require('child_process').execFile;
const config = require('./config.json');

['branch', 'script', 'app_path', 'port'].forEach((option) => {
  if (!config[option]) {
    process.stdout.write(`\nThe Webhook service requires a ${option} to be set\n`);
    process.exit(1);
  }
});

const BRANCH_NAME = config.branch;
const SCRIPT = config.script;
const APP_PATH = config.app_path;
const PORT = parseInt(config.port, 10);

const app = express();

app.use(bodyParser.json());

const validateRequest = (req, res, next) => {
  if (!req || !req.body) {
    res.status(500).send('no request body');
    return;
  }

  if (req && req.body && req.body.ref.indexOf(BRANCH_NAME) === -1) {
    res.status(204).send('no action taken');
    return;
  }

  /* eslint-disable no-param-reassign */
  res.locals.event = req.get('X-GitHub-Event');
  res.locals.signature = req.get('X-Hub-Signature');
  res.locals.id = req.get('X-GitHub-Delivery');

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

  res.status(204);
  /* eslint-enable no-param-reassign */
};

app.post('/webhook', validateRequest, (req, res) => {
  // NOTE at this point we have checked that the event is either a push or a merge of our designated branch
  execFile('sh', [SCRIPT, APP_PATH, BRANCH_NAME], { cwd: process.cwd(), encoding: 'utf8' }, (err, stdout, stderr) => {
    if (err) {
      process.stdout.write('\nerror executing webhook\n');
      process.stdout.write(stderr);
      res.status(500).json({
        message: 'error attempting to update',
        err,
      });
      return;
    }
    res.status(200).json({
      message: 'success',
      result: stdout,
    });
  });
});

app.use((req, res) => {
  res.status(404).send('404');
});

app.listen(PORT, () => {
  process.stdout.write(`Webhook Service listening on port ${PORT}`);
});
