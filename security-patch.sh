#!/bin/sh
printf '%s\n' 'This patcher is retired and intentionally makes no changes.'
printf '%s\n' 'Do not inject security.js: its browser-side checks are not an authorization boundary.'
printf '%s\n' 'Configure Firebase Authentication, deploy database.rules.json, and set host response headers instead.'
exit 1
