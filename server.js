const express = require('express')
const path = require('path');
const { spawn } = require('child_process');

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
      '/usr/bin/rsync', '-arv', '--delete',
      path.join(ssdPath, '/hdd-backup/timon', folderName), hddPath
    ]
  },
  {
    name: "sync ssd -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv', '--exclude', 'postgres','--delete',
      ssdPath, backupPath
    ]
  }
]

// list available commands for the UI to render buttons from
app.get('/api/commands', (req, res) => {
  const list = Object.entries(commands).map(([id, c]) => ({
    id, label: c.name || [],
  }));
  res.json(list);
});

app.get('/api/run', (req, res) => {
  const id = req.query.id;
  const dryRun = req.query.dr !== '0';
  const cmd = commands[id];
  if (!cmd) {
    res.status(404).end();
    return;
  }

  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  };
  res.writeHead(200, headers);

  let additionalAgrs = [];
  if (cmd.hasDryRun && dryRun) {
    additionalAgrs.push('-n');
  }

  const cmdlist = cmd.command.concat(additionalAgrs);

  const cmdString = ('sudo ' + cmdlist.join(' ')).replace(new RegExp('/', 'g'), '\\');
  res.write(`event: start\n`);
  res.write(`data: ${JSON.stringify({hasDryRun: cmd.hasDryRun, out: String(cmdString) })}\n\n`)


  const runCommand = spawn('ping', ['192.168.2.57']);
  //const runCommand = spawn('sudo', cmdlist);


  runCommand.stdout.setEncoding('utf8');
  runCommand.stdout.on('data', (chunk) => {
    res.write(`event: stdout\n`);
    res.write(`data: ${JSON.stringify({ out: String(chunk) })}\n\n`);
  });

  runCommand.stderr.on('data', (data) => {
    res.write(`event: stderr\n`);
    res.write(`data: ${JSON.stringify({ out: String(data) })}\n\n`);
  });

  runCommand.once('error', (err) => {
    res.write(`event: err\n`);
    res.write(`data: ${JSON.stringify({ out: String(err) })}\n\n`);
    res.end();
  });

  runCommand.once('exit', (code) => {
    res.write(`event: exit\n`);
    res.write(`data: exited with code ${code}\n\n`);
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
