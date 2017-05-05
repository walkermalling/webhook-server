const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const execFile = require('child_process').execFile;
const config = require('./config.json');

if (!config.secret) {
  // if you don't want to store this secret in a config file
  // you can set it as an env
  config.secret = process.env.GITHUB_WEBHOOK_SECRET;
}

['branch', 'script', 'app_path', 'port', 'secret'].forEach((option) => {
  if (!config[option]) {
    process.stdout.write(`\nThe Webhook service requires a ${option} to be set\n`);
    process.exit(1);
  }
});

const PORT = parseInt(config.port, 10);

const app = express();

app.use(bodyParser.json());

const authenticate = (req, res, next) => {
  const body = new Buffer(JSON.stringify(req.body));
  const hmac = crypto.createHmac('sha1', config.secret);
  const payloadSignature = hmac.update(body, 'utf8').digest('hex');
  if (payloadSignature === req.get('X-Hub-Signature')) {
    next();
  } else {
    res.status(403).send('boo');
  }
};

const validateRequest = (req, res, next) => {
  if (!req || !req.body) {
    res.status(500).send('no request body');
    return;
  }

  if (req && req.body && req.body.ref.indexOf(config.branch) === -1) {
    res.status(204).send('no action taken');
    return;
  }

  /* eslint-disable no-param-reassign */
  res.locals.event = req.get('X-GitHub-Event');
  res.locals.id = req.get('X-GitHub-Delivery');
  /* eslint-enable no-param-reassign */

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
};

app.post('/hooks/github', authenticate, validateRequest, (req, res) => {
  // NOTE at this point we have checked that the event is either a push or a merge of our designated branch
  const args = [config.script, config.app_path, config.branch];
  const opts = { cwd: process.cwd(), encoding: 'utf8' };
  execFile('sh', args, opts, (err, stdout, stderr) => {
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
