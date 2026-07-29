const path = require('path');

const hdd = '/mnt/sda';
const ssd = '/home/timon';
const backup = '/mnt/sdb';

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
      '--filter=merge hdd-ssd_filter.txt',
      path.join(hdd, 'shared'), ssd
    ]
  },
  {
    name: "sync ssd -> hdd",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--filter=merge hdd-ssd_filter.txt',
      path.join(ssd, 'shared'), hdd
    ]
  },
  {
    name: 'mount backup drive',
    hasDryRun: false,
    command: ['mount', '/mnt/sdb']
  },
  {
    name: 'umount backup drive',
    hasDryRun: false,
    command: ['umount', '/mnt/sdb']
  },
  {
    name: "sync ssd/immich-app -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--filter=merge ssdImmich-backup_filter.txt',
      '--no-perms', '--no-owner', '--no-group',
      path.join(ssd, 'immich-app'), backup
    ]
  },
  {
    name: "sync backup/immich-app -> ssd",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--filter=merge ssdImmich-backup_filter.txt',
      '--no-perms', '--no-owner', '--no-group',
      path.join(backup, 'immich-app'), ssd
    ]
  },
  {
    name: "sync ssd/shared -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--no-perms', '--no-owner', '--no-group',
      path.join(ssd, 'shared'), backup
    ]
  },
  {
    name: "sync hdd -> backup",
    hasDryRun: true,
    command: [
      '/usr/bin/rsync', '-arv',
      '--filter=merge hdd-backup_filter.txt',
      '--no-perms', '--no-owner', '--no-group',
      path.join(hdd, 'shared'), backup
    ]
  }
]

module.exports = {commands};