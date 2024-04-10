@ECHO OFF

TITLE Discord Bot - Starting...

SET WT=Discord Bot - %CD%

ECHO Killing other instances of this bot.
ECHO taskkill /fi "windowtitle eq %WT%"
taskkill /fi "windowtitle eq %WT%"

ECHO Changing window title to: %WT%
TITLE %WT%

ECHO Starting bot...
node index

PAUSE