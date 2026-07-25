const express = require('express')
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const fs = require('fs');
const app = express()
const port = 3141

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

const commands = [
  {
    name: 'get state',
    command: ['/sbin/hdparm', '-C', '/dev/sda']
  },
  {
    name: 'spin down',
    command: ['/sbin/hdparm', '-y', '/dev/sda']
  },
  {
    name: "sync hdd -> ssd",
    command: [
      '/usr/bin/rsync', '-arv',
      '--exclude', '*/sd', '--exclude', '*/extra meuk', '--delete',
      '/mnt/sda/shared/timon/fotos', '/home/timon/hdd-backup/timon', '-n'
    ]
  },
  {
    name: "sync ssd -> hdd",
    command: [
      '/usr/bin/rsync', '-arv', '--delete',
      '/home/timon/hdd-backup/timon/fotos', '/mnt/sda/shared/timon', '-n'
    ]
  }
]


app.get('/', (req, res) => {
  res.sendFile('index.html', {root: __dirname })
})

app.post('/', (req, res) => {
  const body = req.body;
  const html = fs.readFileSync('index.html', {root: __dirname }).toString();
  const cmd = commands[2];
  
  const { stdout, stderr } = await execFileAsync('sudo', cmd.command);

  res.send(html + '<p>' + cmd.command + '</p><p style="white-space: pre-line">' + stdout.toString() + '</p>');
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
