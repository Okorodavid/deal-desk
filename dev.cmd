@echo off
rem The agent-native CLI breaks on folder paths with spaces on Windows.
rem Map this folder's parent to a spare drive letter and run from there.
set ROOT=%~dp0..
if not exist R:\deal-desk subst R: "%ROOT%"
R:
cd \deal-desk
pnpm %*
