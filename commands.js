const path = require('path');

const hddPath = '/mnt/sda/shared';
const ssdPath = '/home/timon';
const backupPath = '/mnt/sdb';

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
      '--filter="merge filter.txt"', '--delete',
      path.join(hddPath, '/*'), path.join(ssdPath, 'hdd-backup')
    ]
  },
  {
    name: "sync ssd -> hdd",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--exclude', '*/sd', '--exclude', '*/extra meuk', '--delete',
      path.join(ssdPath, '/hdd-backup/*'), hddPath
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

module.exports = {commands};