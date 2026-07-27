async function loadCommands() {
    const res = await fetch('/api/commands');
    const cmds = await res.json();
    const container = document.getElementById('buttons');
    container.innerHTML = '';
    cmds.forEach(c => {
        const btn = document.createElement('button');
        btn.textContent = c.label;
        btn.onclick = () => runCommand(c.id, false);
        container.appendChild(btn);
    });
}

async function runCommand(id, doit) {
    const doitBtn = document.getElementById('doit');
    doitBtn.style.display = 'none';

    const res = await fetch(`/api/run?id=${id}&doit=${doit ? 1 : 0}`, { method: 'POST' });
    subscribeToOutput();
    const {hasDryRun, cmdString} = await res.json();

    console.log(hasDryRun, cmdString);

    if (hasDryRun && !doit) {
        doitBtn.onclick = () => runCommand(id, true);
        doitBtn.style.display = 'block';
    } else {
        doitBtn.style.display = 'none';
    }
}

function subscribeToOutput() {
    const command = document.getElementById('command');

    const output = document.getElementById('output');
    output.textContent = '';

    const evtSource = new EventSource(`api/subscribe`);

    evtSource.addEventListener('cmd', (e) => {
        command.textContent = e.data;
        console.log(e.data);
    });

    evtSource.addEventListener('stdout', (e) => {
        const data = JSON.parse(e.data);
        output.textContent += data.out;
    });

    evtSource.addEventListener('stderr', (e) => {
        const data = JSON.parse(e.data);
        output.textContent += '\n[stderr] ' + data.out;
    });

    evtSource.addEventListener('err', (e) => {
        const data = JSON.parse(e.data);
        output.textContent += '\n[error] ' + data.out;
        evtSource.close();
    });

    evtSource.addEventListener('exit', (e) => {
        output.textContent += '\n' + e.data;
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