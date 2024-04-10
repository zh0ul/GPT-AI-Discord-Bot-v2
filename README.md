# Requirements
**node.js** Specifically, the `npm` and `node` commands.
- Download link: https://nodejs.org/en/download/
- Once installed, open a command prompt and make sure npm and node available:
```bat
where npm
where node
```
- Example:
```bat
S:\Zhoul\VSCode-Projects\GPT-AI-Discord-Bot>where npm
C:\Utils\Node\npm
C:\Utils\Node\npm.cmd

S:\Zhoul\VSCode-Projects\GPT-AI-Discord-Bot>where node
C:\Utils\Node\node.exe
```
**MongoDB - Community Server**
- Download link: https://www.mongodb.com/try/download/community
- Once installed, no further action is required, though you may use MongoDB Compass (installed automatically) to view the data in the database.

# NPM Initialization
```
npm init -y
npm install --save bufferutil  utf-8-validate  openai  discord.js  printf  jimp  mongodb  png-chunks-extract  png-chunk-text  png-chunks-encode  sanitize-filename
```

# config.json
- config.json is used to store your `OPENAI_API_KEY` and `DISCORD_BOT_API_KEY`
- You can move the example file `config.json.example` to `config.json` and edit it, or create your own
- Below are what the contents of `config.json` should look like
```
{
  "DISCORD_BOT_TOKEN": "XXXXXXXXXXXXXXXXXXX.YYYYYYYYYYYYYYYYYYY",
  "GROQ_API_KEY": "",
  "OPENAI_API_KEY": "",
  "OPENAI_BASE_PATH": "https://api.openai.com/v1",
  "OPENAI_BASE_PATH_LOCAL":  "http://127.0.0.1:5000/v1",
  "OPENAI_BASE_PATH_DEFAULT": "https://api.openai.com/v1",
  "OPENAI_MAX_TOKENS": 512,
  "GROQ_BASE_PATH": "https://api.groq.com/openai/v1",
  "MONGO_BASE_PATH": "mongodb://0.0.0.0:27017/",
  "MONGO_DB_NAME": "ai"
}
```
- You can get `DISCORD_BOT_API_KEY` from:  https://discord.com/developers/applications/
- You can get `GROQ_API_KEY` from:  https://wow.groq.com/
- You can get `OPENAPI_API_KEY` from:  https://beta.openai.com/account/api-keys

# Running
```
node index
```
- Example:
```
S:\Zhoul\VSCode-Projects\GPT-AI-Discord-Bot>node index
Directory logs already exists.
Directory data already exists.
Directory templates already exists.
Directory images already exists.

//////////////////////////////
// Events.ClientReady
//////////////////////////////

[DiscordAPI] Logged in as AlyxGPT#1587
```

# Turning it into a binary
**In windows, for windows**
```
npm install -g pkg
pkg index.js -o GPT-AI-Discord-Bot.exe
GPT-AI-Discord-Bot.exe
```
**In windows, for linux**
```
npm install -g pkg
pkg index.js -o GPT-AI-Discord-Bot-Linux -t node18-linux
./GPT-AI-Discord-Bot-Linux
```

# Bot Commands

General Commands
!help              or  !he
!commands          or  !co
!image             or  !i
!image-variation   or  !iv

Channel Settings
!prefix

Profile Commands
!profile           or  !p
!codeblock         or  !cb
!prompt            or  !pro
!history           or  !h
!clear             or  !c

GPT Settings (per profile)
!gpt-settings      or  !g
!model             or  !m
!temperature       or  !t
!top-p             or  !to
!presence-penalty  or  !pr
!frequency-penalty or  !fr

# Invite Link Example
- In the discord developer portal, under Applications
- Under OAuth2, is a Link Generator.
- Below is an example link for AlexGPT
- https://discord.com/api/oauth2/authorize?client_id=1056039374464237648&permissions=515463695424&scope=bot

# To Do
- Add reaction handling.
- Integrate createImageEdit() https://beta.openai.com/docs/api-reference/images/create?lang=node.js

# Done
- Add ! commands that can change GPT settings, like temperature, per profile.
- Integrate createImageVariation() https://beta.openai.com/docs/api-reference/images/create?lang=node.js
