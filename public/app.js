let btns = [];
let selected = null;

async function loadCommands() {
    const res = await fetch('/api/commands');
    const d = await res.json();

    const container = document.getElementById('drives_container');
    container.innerHTML = '';

    d.drives.forEach((drive, driveId) => {
        const drive_container = document.createElement('div');
        drive_container.classList.add('drive');
        drive_container.textContent = drive.name;

        let driveBtns = [];
        const foldersContainer = document.createElement('div');
        foldersContainer.classList.add('folders');
        d.folders.forEach((folder, folderId) => {
            const btn = document.createElement('button');
            btn.textContent = folder;
            btn.onclick = () => folderBtnClick(driveId, folderId);
            foldersContainer.appendChild(btn);
            driveBtns.push(btn);
        });
        drive_container.appendChild(foldersContainer);
        btns.push(driveBtns);

        const btnsContainer = document.createElement('div');
        btnsContainer.classList.add('btns_container');
        drive.commands.forEach((cmd, cmdId) => {
            const btn = document.createElement('button');
            btn.textContent = cmd.name;
            btn.onclick = () => runCommand(driveId, cmdId);
            btnsContainer.appendChild(btn);
        });
        drive_container.appendChild(btnsContainer);

        container.appendChild(drive_container);
    });
}

async function folderBtnClick(driveId, folderId) {
    let current = [driveId, folderId];
    btns.forEach((driveBtns) => {
        driveBtns[1 - folderId].disabled = true;
    });

    if (selected) {
        console.log(selected, current);
        if (selected[0] === current[0] && selected[1] === current[1]) {
            clearUi();
        } else {
            btns[driveId][folderId].classList = ['selected'];
            const doitBtn = document.getElementById('doit');
            const res = await runRsync(selected[0], current[0], selected[1], true);
            if (res.status == 200) {
                doitBtn.onclick = () => runRsync(selected[0], current[0], selected[1], false);
                doitBtn.style.display = 'block';
            }
        }
    } else {
        selected = current;
        btns[driveId][folderId].classList = ['selected'];
    }
}

async function runRsync(src, dest, folder, dryRun) {
    const deleteArg = document.getElementById('delete').checked;
    const res = await fetch(`/api/runRsync`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ src, dest, folder, dryRun, deleteArg })
        }
    );
    if (res.status == 200) {
        subscribeToOutput();
    }
    return res;
}

async function runCommand(driveId, cmdId) {
    const res = await fetch(`/api/run?driveId=${driveId}&cmdId=${cmdId}`, { method: 'POST' });
    if (res.status == 200) {
        subscribeToOutput();
    }
}

async function clearUi() {
    const doitBtn = document.getElementById('doit');
    doitBtn.style.display = 'none';
    selected = null;
    btns.forEach((driveBtns) => {
        driveBtns.forEach((btn) => {
            btn.disabled = false;
            btn.classList = [];
        })
    })
    await fetch('/api/clear', { method: 'POST' });
    subscribeToOutput();
}

function subscribeToOutput() {
    const command = document.getElementById('command');
    command.textContent = 'command';

    const output = document.getElementById('output');
    output.textContent = '';

    const evtSource = new EventSource(`api/subscribe`);

    evtSource.addEventListener('cmd', (e) => {
        command.textContent = e.data;
    });

    evtSource.addEventListener('stdout', (e) => {
        const data = JSON.parse(e.data);
        output.textContent += data.out;
        output.scrollTop = output.scrollHeight;
    });

    evtSource.addEventListener('stderr', (e) => {
        const data = JSON.parse(e.data);
        output.textContent += '\n[stderr] ' + data.out;
        output.scrollTop = output.scrollHeight;
    });

    evtSource.addEventListener('err', (e) => {
        const data = JSON.parse(e.data);
        output.textContent += '\n[error] ' + data.out;
        output.scrollTop = output.scrollHeight;
        evtSource.close();
    });

    evtSource.addEventListener('exit', (e) => {
        output.textContent += '\n' + e.data;
        output.scrollTop = output.scrollHeight;
        evtSource.close(); // important — see note below
    });

    evtSource.onerror = (err) => {
        console.error('SSE connection error', err);
        evtSource.close();
    };
}

async function stop() {
    await fetch('/api/stop', { method: 'POST' });
}

loadCommands();
subscribeToOutput();