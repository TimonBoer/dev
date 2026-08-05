const express = require('express')
const path = require('path');
const basicAuth = require('express-basic-auth');
const { spawn } = require('child_process');
const { send } = require('process');
const { drives, folders, getRsyncCmd} = require('./commands');
const { get } = require('http');


const app = express();
const port = 3141;

app.use(basicAuth({
  users: { 'timon': 'boem' },
  challenge: true,
}));

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// parse application/json
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

let runningCommand = null;

let outputBuffer = [];   // array of {event, data} — the full history of the current/last run
let subscribers = [];    // list of `res` objects currently listening live

function broadcast(event, data) {
  outputBuffer.push({ event, data });
  subscribers.forEach((res) => sendEvent(res, event, data));
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
}

function shellQuote(arg) {
  arg = arg.replace(new RegExp("\\\\", "g"), '/');
  // If the arg is "safe" (no special chars), leave it unquoted for readability
  if (/^[a-zA-Z0-9_\-./=:@]+$/.test(arg)) {
    return arg;
  }
  // Otherwise wrap in single quotes, escaping any existing single quotes
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function toShellCommand(cmd, args) {
  return [cmd, ...args].map(shellQuote).join(' ');
}

// list available commands for the UI to render buttons from
app.get('/api/commands', (req, res) => {
  res.json({drives, folders});
});

app.post('/api/runRsync', (req, res) => {
  if (runningCommand) {
    res.status(409).json({ error: 'A command is already running' });
    return;
  }
  const d = req.body;

  let additionalArgs = [];
  if (d.dryRun) {
    additionalArgs.push('-n');
  }

  if (d.deleteArg) {
    additionalArgs.push('--delete');
  }

  const cmdList = getRsyncCmd(d.src, d.dest, d.folder).concat(additionalArgs);

  runCmdList(cmdList);
  res.end();
});

app.post('/api/run', (req, res) => {
  if (runningCommand){
    res.status(409).json({ error: 'A command is already running' });
    return;
  }
  const driveId = req.query.driveId;
  const cmdId = req.query.cmdId;
  
  const cmd = drives[driveId].commands[cmdId];
  if (!cmd) {
    res.status(404).end();
    return;
  }

  runCmdList(cmd.command);
  res.end();
});

function runCmdList(cmdList) {
  outputBuffer = []; // fresh history for this run
  //runningCommand = spawn('ipconfig', ['-a']);
  runningCommand = spawn('sudo', cmdList);
  runningCommand.stdout.setEncoding('utf8');

  // Attach listeners immediately — before returning the response —
  // so nothing can be emitted before we're capturing it.
  runningCommand.stdout.on('data', (chunk) => {
    broadcast('stdout', JSON.stringify({ out: String(chunk) }));
  });

  runningCommand.stderr.on('data', (data) => {
    broadcast('stderr', JSON.stringify({ out: String(data) }));
  });

  runningCommand.once('error', (err) => {
    broadcast('err', JSON.stringify({ out: String(err) }));
    runningCommand = null;
  });

  runningCommand.once('exit', (code) => {
    broadcast('exit', `exited with code ${code}`);
    runningCommand = null;
  });

  const cmdString = toShellCommand('sudo', cmdList);
  broadcast('cmd', cmdString);
};

app.get('/api/subscribe', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  });

  // Catch this connection up on everything that already happened
  outputBuffer.forEach(({ event, data }) => sendEvent(res, event, data));

  if (runningCommand) {
    subscribers.push(res);
    req.on('close', () => {
      subscribers = subscribers.filter((s) => s !== res);
    });
  } else {
    res.end(); // nothing running, buffer replay above is all there is
  }
});

app.post('/api/clear', (req, res) => {
  if (!runningCommand) {
    outputBuffer = [];
    subscribers = [];
  }
  res.end();
})

app.post('/api/stop', (req, res) => {
  if (runningCommand) {
    runningCommand.kill();
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
