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


app.get('/', (req, res) => {
  res.sendFile('index.html', {root: __dirname })
})

app.post('/', (req, res) => {
  const body = req.body;
  let command = '';
  const html = fs.readFileSync('index.html', {root: __dirname }).toString();
  if (body.cmd == 0) { //get state
    command = 'sudo hdparm -C ' + body.drive;
  } else if (body.cmd == 1) { //set state
    command = 'sudo hdparm -y ' + body.drive;
  } else if (body.cmd == 2) { //sync hdd -> ssd
    command = `sudo rsync -arv --exclude "*/sd" --exclude "*/extra meuk" --delete "/mnt/sda/shared/afbeeldingen" "/home/timon/hdd-backup"`;
  } else if (body.cmd == 3) { //sync ssd -> hdd
    command = `sudo rsync -arv --exclude "*/sd" --exclude "*/extra meuk" --delete "/home/timon/hdd-backup/afbeeldingen" "/mnt/sda/shared"`;
  } else if (body.cmd == 4) { //dry run hdd -> ssd
    command = `sudo rsync -arvn --exclude "*/sd" --exclude "*/extra meuk" --delete "/mnt/sda/shared/afbeeldingen" "/home/timon/hdd-backup"`;
    let stdout = execSync(command).toString();
    res.send(html + '<p>' + command + '</p><p style="white-space: pre-line">' + stdout + '</p>' + '<form action="" method="post"><button name="cmd" value=2>do it</button></form>');
    return;
  } else if (body.cmd == 5) { //dry run ssd -> hdd
    command = `sudo rsync -arvn --exclude "*/sd" --exclude "*/extra meuk" --delete "/home/timon/hdd-backup/afbeeldingen" "/mnt/sda/shared"`;
    let stdout = execSync(command).toString();
    res.send(html + '<p>' + command + '</p><p style="white-space: pre-line">' + stdout + '</p>' + '<form action="" method="post"><button name="cmd" value=3>do it</button></form>');
    return;
  }

  let stdout = execSync(command).toString();

  res.send(html + '<p>' + command + '</p><p style="white-space: pre-line">' + stdout + '</p>');
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
