const express = require('express')
const path = require('path');
const { spawn } = require('child_process');
const { send } = require('process');

const app = express()
const port = 3141

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))

// parse application/json
app.use(express.json())

app.use(express.static(path.join(__dirname, 'public')))

const hddPath = '/mnt/sda/shared/timon';
const ssdPath = '/home/timon/immich-app';
const backupPath = '/mnt/sdb'
const folderName = 'fotos';

const commands = [
  {
    name: 'mount all',
    hasDryRun: false,
    command: ['mount', '-a']
  },
  {
    name: 'get state',
    hasDryRun: false,
    command: ['/sbin/hdparm', '-C', '/dev/sda']
  },
  {
    name: 'spin down',
    hasDryRun: false,
    command: ['/sbin/hdparm', '-y', '/dev/sda']
  },
  {
    name: "sync hdd -> ssd",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--exclude', '*/sd', '--exclude', '*/extra meuk', '--delete',
      path.join(hddPath, folderName), path.join(ssdPath, 'hdd-backup/timon')
    ]
  },
  {
    name: "sync ssd -> hdd",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--exclude', '*/sd', '--exclude', '*/extra meuk', '--delete',
      path.join(ssdPath, '/hdd-backup/timon', folderName), hddPath
    ]
  },
  {
    name: "sync ssd -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv', '--exclude', 'postgres',
      '--no-perms', '--no-group', '--no-owner', '--delete',
      ssdPath, backupPath
    ]
  }
]

let runningCommand = null;

let outputBuffer = [];   // array of {event, data} — the full history of the current/last run
let subscribers = [];    // list of `res` objects currently listening live

function broadcast(event, data) {
  outputBuffer.push({ event, data });
  subscribers.forEach((res) => sendEvent(res, event, data));
}

// list available commands for the UI to render buttons from
app.get('/api/commands', (req, res) => {
  const list = Object.entries(commands).map(([id, c]) => ({
    id, label: c.name || [],
  }));
  res.json(list);
});

app.post('/api/run', (req, res) => {
  if (runningCommand){
    res.status(409).json({ error: 'A command is already running' });
    return;
  }
  const id = req.query.id;
  const doit = req.query.doit === '1';
  const cmd = commands[id];
  if (!cmd) {
    res.status(404).end();
    return;
  }

  let additionalArgs = [];
  if (cmd.hasDryRun && !doit) {
    additionalArgs.push('-n');
  }

  const cmdlist = cmd.command.concat(additionalArgs);

  outputBuffer = []; // fresh history for this run
  //runningCommand = spawn('ping', ['192.168.0.116']);
  runningCommand = spawn('sudo', cmdlist);
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

  const cmdString = ('sudo ' + cmdlist.join(' ')).replace(new RegExp('/', 'g'), '\\');
  broadcast('cmd', cmdString);
  const hasDryRun = cmd.hasDryRun;

  res.json({ hasDryRun, cmdString });
});

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

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
}

app.post('/api/stop', (req, res) => {
  if (runningCommand) {
    runningCommand.kill();
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
