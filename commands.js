const path = require('path');

const drives = [
  {
    name: 'ssd',
    path: '/home/timon',
    commands: []
  },
  {
    name: 'hdd',
    path: '/mnt/sda',
    commands: [
      {
        name: 'get state',
        command: ['/sbin/hdparm', '-C', '/dev/sda']
      },
      {
        name: 'spin down',
        command: ['/sbin/hdparm', '-y', '/dev/sda']
      }
    ]
  },
  {
    name: 'backup',
    path: '/mnt/sdb',
    commands: [
      {
        name: 'mount',
        command: ['mount', '/mnt/sdb']
      },
      {
        name: 'umount',
        command: ['umount', '/mnt/sdb']
      }
    ]
  }
]

const folders = [
  'immich', 'shared'
]

function getRsyncCmd(srcId, destId, folderId) {
  const src = drives[srcId];
  const dest = drives[destId];
  const folder = folders[folderId];

  const driveNames = [src.name, dest.name].sort();

  const rsync = ['/usr/bin/rsync', '-arv'];

  let filterArg = [];
  if (folder == 'shared') {
    const filter = `${driveNames[0]}-${driveNames[1]}_filter.txt`;
    filterArg = [`--filter=merge ${filter}`];
  } else if (folder == 'immich') {
    const filter = `immich_filter.txt`;
    filterArg = [`--filter=merge ${filter}`];
  }

  const noPermArgs = ['--no-perms', '--no-owner', '--no-group'];

  const paths = [path.join(src.path, folder), dest.path];

  const cmd = rsync.concat(filterArg, noPermArgs, paths);

  return cmd;
}

module.exports = {drives, folders, getRsyncCmd};