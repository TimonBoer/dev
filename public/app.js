async function loadCommands() {
    const res = await fetch('/api/commands');
    const cmds = await res.json();
    const container = document.getElementById('buttons');
    container.innerHTML = '';
    cmds.forEach(c => {
        const btn = document.createElement('button');
        btn.textContent = c.label;
        btn.onclick = () => runCommand(c.id, true);
        container.appendChild(btn);
    });
}

function runCommand(id, dr) {
    const command = document.getElementById('command');
    const output = document.getElementById('output');
    document.getElementById('doit').style.display = 'none';

    let hasDryRun = false;
    let pid;
    output.textContent = '';

    const evtSource = new EventSource(`/api/run?id=${id}&dr=${dr ? 1 : 0}`);

    evtSource.addEventListener('cmd', (e) => {
        const data = JSON.parse(e.data);
        command.textContent = data.out;
        hasDryRun = data.hasDryRun;
    });

    evtSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data);
        pid = data.pid;
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
        const doitBtn = document.getElementById('doit');
        if (hasDryRun && dr) {
            doitBtn.onclick = () => runCommand(id, false);
            doitBtn.style.display = 'block';
        } else {
            doitBtn.style.display = 'none';
        }
        evtSource.close(); // important — see note below
    });

    evtSource.onerror = (err) => {
        console.error('SSE connection error', err);
        evtSource.close();
    };
}

loadCommands();