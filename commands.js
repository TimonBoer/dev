const path = require('path');

const hddPath = '/mnt/sda';
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
      '--filter=merge hdd-ssd_filter.txt', '--delete',
      path.join(hddPath, 'shared'), ssdPath
    ]
  },
  {
    name: "sync ssd -> hdd",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--filter=merge hdd-ssd_filter.txt', '--delete',
      path.join(ssdPath, 'shared'), hddPath
    ]
  },
  {
    name: "sync ssd/immich-app -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--filter=merge ssd-backup_filter.txt', '--delete',
      path.join(ssdPath, 'immich-app'), backupPath
    ]
  },
  {
    name: "sync ssd/shared -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      , path.join(ssdPath, 'shared'), backupPath
    ]
  },
  {
    name: "sync hdd -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--filter=merge hdd-backup_filter.txt', '--delete',
      path.join(hddPath, 'shared'), backupPath
    ]
  }
]

module.exports = {commands};