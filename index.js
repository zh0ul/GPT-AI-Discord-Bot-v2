///////////////////////////
// Packages and Constants
/////////////////////////
const fs     = require('node:fs');
const crypto = require('node:crypto');
const path   = require('node:path');
const http   = require('http');
const https  = require('https');
const Jimp   = require('jimp');
const SD     = require('./stable-diffusion-library.js')


/////////////////////////////////
// Directories used by this app
///////////////////////////////
const dirs = {
  logs:             "logs",
  data:             "data",
  templates:        "templates",
  templates_custom: "templates_custom",
  images:           "images",
  commands:         "commands",
}


//////////////////////
// app_config
////////////////////
const app_config                 = require("./config.json");
const CHAT_APIS                  = app_config.CHAT_APIS;
const IMAGE_APIS                 = app_config.IMAGE_APIS;
const SELECTED_CHAT_API          = app_config.SELECTED_CHAT_API;
const SELECTED_IMAGE_API         = app_config.SELECTED_IMAGE_API;
const MONGO_URI                  = app_config.MONGO_BASE_PATH + app_config.MONGO_DB_NAME;
const DEFAULT_CHAT_MODEL         = app_config.DEFAULT_CHAT_MODEL;
const DEFAULT_CHARACTER_CARD_URL = app_config.DEFAULT_CHARACTER_CARD_URL;
const DEFAULT_MAX_TOKENS         = app_config.DEFAULT_MAX_TOKENS;
const DEFAULT_MAX_NEW_TOKENS     = app_config.DEFAULT_MAX_NEW_TOKENS;
const ALLOW_DIRECT_MESSAGES      = app_config.ALLOW_DIRECT_MESSAGES;
const IGNORE_SILENT_MESSAGES     = app_config.IGNORE_SILENT_MESSAGES;
const DISCORD_BOT_TOKEN          = app_config.DISCORD_BOT_TOKEN;
const DEFAULT_CHAT_SYSTEM_PROMPT = app_config.DEFAULT_CHAT_SYSTEM_PROMPT;
const IGNORE_MESSAGES_AT_OTHERS  = app_config.IGNORE_MESSAGES_AT_OTHERS;
const DEFAULT_USER_CARD_FILE     = app_config.DEFAULT_USER_CARD_FILE;
const DEFAULT_BOT_CARD_FILE      = app_config.DEFAULT_BOT_CARD_FILE;
const DEBUG_MODE                 = app_config.DEBUG_MODE;
const CHAT_RESPONSE_MAX_BYTES    = app_config.CHAT_RESPONSE_MAX_BYTES;
const DEFAULT_MEMORY_DEPTH       = app_config.DEFAULT_MEMORY_DEPTH;

//////////////////////
// Character Cards
////////////////////

// Load Character Card Library
const { cCards } = require('./character-card-library.js');

let DEFAULT_USER_CARD
let DEFAULT_BOT_CARD

//////////////////////
// MongoDB Client
////////////////////
const { MongoClient } = require("mongodb");


//////////////////////
// Discord Client
////////////////////
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  Typing,
  SlashCommandBuilder,
  ActionRowBuilder,        // https://discordjs.guide/interactions/select-menus.html#deferring-and-updating-the-select-menu-s-message
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, 
  PermissionsBitField,     // const adminPermissions = new PermissionsBitField(PermissionsBitField.Flags.Administrator);
  AttachmentBuilder,       // const attachment = new AttachmentBuilder(buffer,{name: 'test.png', description: ''});
  EmbedBuilder,            // https://discordjs.guide/popular-topics/embeds.html
  MessageReaction,
  ReactionManager,
  Message,
  CommandInteraction,
  ComponentBuilder,
  ChannelType,
  InteractionType,
  MessageType,
  ThreadChannel,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  // bold, italic, strikethrough, underscore, spoiler, quote, blockQuote
} = require('discord.js');


const client = new Client({
  intents:  [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});
client.commands = new Collection();


/////////////////////
// OpenAIApi Client
///////////////////
const { Configuration, OpenAI } = require("openai");
const { log } = require('node:console');

// Start Chat Client
const openai = new OpenAI({
  apiKey:   CHAT_APIS[SELECTED_CHAT_API].API_KEY,
  basePath: CHAT_APIS[SELECTED_CHAT_API].BASE_PATH, // renamed to baseURL, but we include both for compatibility.
  baseURL:  CHAT_APIS[SELECTED_CHAT_API].BASE_PATH  // baseURL: "https://api.openai.com/v1"
});

// Start Image Client
const image_openai = new OpenAI({
  apiKey:   IMAGE_APIS[SELECTED_IMAGE_API].API_KEY,
  basePath: IMAGE_APIS[SELECTED_IMAGE_API].BASE_PATH, // renamed to baseURL, but we include both for compatibility.
  baseURL:  IMAGE_APIS[SELECTED_IMAGE_API].BASE_PATH  // baseURL: "https://api.openai.com/v1"
});


// Commands
const Commands = {};


// Emojis
const Emojis = {
  white_check_mark: "✅",
  joy:   "😂",
  x:     "❌",
  arrows_counterclockwise: "🔄",
  replay: "🔁"
}


//////////////
// Classes
////////////

class TavernCardV2
{
  constructor(c = {data: {}})
  {
    if (!c) c = {};
    this.spec = c.spec || 'chara_card_v2';
    this.spec_version = c.spec_version || '2.0';
    if (c.name && !c.data) c.data = c;
    if (!c.data) c.data = {};
    this.data = {}
    this.data.name = c.data.name || ""
    this.data.description = c.data.description || ""
    this.data.personality = c.data.personality || ""
    this.data.scenario = c.data.scenario || ""
    this.data.first_mes = c.data.first_mes || ""
    this.data.mes_example = c.data.mes_example || ""
    this.data.creator_notes = c.data.creator_notes || ""
    this.data.system_prompt = c.data.system_prompt || ""
    this.data.post_history_instructions = c.data.post_history_instructions || ""
    this.data.alternate_greetings = c.data.alternate_greetings || []
    this.data.character_book = c.data.character_book
    this.data.tags = c.data.tags || []
    this.data.creator = c.data.creator || ""
    this.data.character_version = c.data.character_version || ""
    this.data.extensions = c.data.extensions || {}
  }

  // Example method to add an alternate greeting
  addAlternateGreeting(greeting) { this.data.alternate_greetings.push(greeting); }

  // Example method to add a tag
  addTag(tag) { this.data.tags.push(tag);  }
}


class OpenAIImageRequest
{
  constructor(c = {})
  {
    this.model  = c.model  || "dall-e-3";
    this.prompt = c.prompt || null;
    this.n      = c.n      || 1;
    this.size   = c.size   || "1024x1024";
  }
}


class OpenAIImageVariationRequest
{
  constructor(c = {})
  {
    this.model = c.model || "dall-e-3-image-variation";
    this.file  = c.file  || null;
    this.size  = c.size  || "1024x1024";
    this.count = c.count || 1;
  }

}


class OpenAIChatRequest
{
  constructor(c = {})
  {
    this.messages    = c.messages    || [];
    this.model       = c.model       || DEFAULT_CHAT_MODEL || "gpt-3.5-turbo";
    this.max_tokens  = c.max_tokens  || DEFAULT_MAX_NEW_TOKENS || 2048;
    this.temperature = c.hasOwnProperty("temperature") ? c.temperature : 0.5;
    this.top_p       = c.hasOwnProperty("top_p") ? c.top_p : 1.0;
    this.stop        = c.stop        || null
    this.stream      = c.stream      || false
  }
}


class OpenAIMessage
{
  constructor(c = {})
  {
    if (c.name) this.name = c.name
    this.role    = c.role    || "system"
    this.content = c.content || ""
    if (c.hasOwnProperty("seed")) this.seed = c.seed
  }
}


class AIUser
{
  constructor(c)
  {
    if (!c) c = {}
    if (!c.chat_settings) c.chat_settings = {}
    if (!c.image_request) c.image_request = {}
    if (!c.image_variation) c.image_variation = {}
    if (!c.active_channels) c.active_channels = []
    if (!c.discordUser) c.discordUser = {}
    if (!c.usage) c.usage = {}
    this.aiId = c.aiId || crypto.randomUUID();
    this.discordId = c.discordId || "";
    this.guildId = c.guildId || "";
    this.last_seen = c.last_seen || Date.now();
    this.channelId = c.channelId || "";
    this.interaction_count = c.interaction_count || 1;
    this.command_prefix  = c.command_prefix || "!";
    this.last_image_prompt = c.last_image_prompt || "";
    this.last_image_file = c.last_image_file || "";
    this.last_image_prompt_revised = c.last_image_prompt_revised || "";
    this.last_cardId_bot = c.last_cardId_bot || "DEFAULT-BOT-CARD";
    this.last_cardId_user = c.last_cardId_user || "DEFAULT-USER-CARD";
    this.channel_settings = c.channel_settings || {};
    this.chat_settings = c.chat_settings || {};
    this.chat_settings.model = c.chat_settings.model || "mixtral-8x7b-32768";
    this.chat_settings.max_tokens = c.chat_settings.hasOwnProperty("max_tokens") ? c.chat_settings.max_tokens : 3072;
    this.chat_settings.temperature = c.chat_settings.hasOwnProperty("temperature") ? c.chat_settings.temperature : 0.5;
    this.chat_settings.top_p = c.chat_settings.hasOwnProperty("top_p") ? c.chat_settings.top_p : 1.0;
    this.chat_settings.stop = c.chat_settings.stop || null;
    this.chat_settings.stream = c.chat_settings.stream || false;
    this.image_request = c.image_request || {};
    this.image_request.model = c.image_request.model || "dall-e-3";
    this.image_request.prompt = c.image_request.prompt || null;
    this.image_request.n = c.image_request.n || 1;
    this.image_request.size = c.image_request.size || "1024x1024";
    this.image_variation = c.image_variation || {};
    this.image_variation.model = c.image_variation.model || "dall-e-3";
    this.image_variation.file = c.image_variation.file || null;
    this.image_variation.size = c.image_variation.size || "1024x1024";
    this.image_variation.count = c.image_variation.count || 1;
    this.active_channels = c.active_channels || [];
    this.discordUser = c.discordUser || {};
    this.usage = c.usage || {};
  }
}


class AICard
{
  constructor(c = {})
  {
    if (!c) c = {};
    this.spec         = c.spec         || 'chara_card_v2';
    this.spec_version = c.spec_version || '2.0';
    this.data         = c.data         || new TavernCardV2().data;
    this.cardId       = c.cardId       || crypto.randomUUID();
    this.aiId         = c.aiId         || "";
    this.cardName     = c.cardName     || "";
    this.image_url    = c.image_url    || "";
  }
}


class AIChatProfile
{
  constructor(c = {})
  {
    if (!c.card)       c.card       = {};
    if (!c.messages)   c.messages   = [];
    if (!c.messageIds) c.messageIds = [];
    this._id            = c._id;
    this.chatId         = c.chatId         || crypto.randomUUID();
    this.aiId           = c.aiId           || null;
    this.channelId      = c.channelId      || null;
    this.chatName       = c.chatName       || "default";
    this.memory_enabled = c.memory_enabled || false;
    this.memory_depth   = c.hasOwnProperty("memory_depth") ? c.memory_depth : DEFAULT_MEMORY_DEPTH;
    this.user           = c.user           || "";
    this.persona        = c.persona        || "";
    this.prompt         = c.prompt         || "";
    this.cardId_bot     = c.cardId_bot     || "DEFAULT-BOT-CARD";
    this.cardId_user    = c.cardId_user    || "DEFAULT-USER-CARD";
    this.messages       = c.messages       || [];
    this.messageIds     = c.messageIds     || [];
  }
}



//////////////
// Variables
////////////

const template_openai_image_request = {
  model: "dall-e-3",
  prompt: "",
  n: 1,
  size: "1024x1792", // '256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'
};


const template_openai_image_variation_request = {
  model: "dall-e-3-image-variation",
  file:  "file or buffer",
  count: 1,
  size:"1024x1024", // '256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'
};


/////////////////////////////
// Utils
//////////////////////////

const sleep = require('node:timers/promises').setTimeout;

function isNumber(str) { return !isNaN(parseInt(str));   };
function isInt(str)    { return !isNaN(parseInt(str));   };
function isFloat(str)  { return !isNaN(parseFloat(str)); };

function get_date(separator)
{
  if (!separator) separator = "";
  const date  = new Date();
  const year  = date.getFullYear();
  const month = date.getMonth() + 1;
  const day   = date.getDate();
  return `${year}${separator}${month < 10 ? '0' : ''}${month}${separator}${day < 10 ? '0' : ''}${day}`;
}

function get_time(separator)
{
  if (!separator) separator = "";
  const date   = new Date();
  const hour   = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return `${hour < 10 ? '0' : ''}${hour}${separator}${minute < 10 ? '0' : ''}${minute}${separator}${second < 10 ? '0' : ''}${second}`;
}


function combineArrays(list1,list2)
{
  for (const i in list1)  list2[list2.length] = list1[i];
  return list2;
}

function combineMaps(map1,map2,leftWins = true)
{
  const map3 = {};
  for (const k in map1)  if ( leftWins  || !map2.hasOwnProperty(k) )  map3[k] = map1[k];
  for (const k in map2)  if ( !leftWins || !map1.hasOwnProperty(k) )  map3[k] = map2[k];
  return map3;
}

function removeListElement(list, element)
{
  let index = list.indexOf(element);
  if (index > -1) {
    list.splice(index, 1);
  }
  return list;
}

function removeListIndex(list, index)
{
  // Check if index is valid
  if (index < 0 || index >= list.length) {
    return false;
  }
  // Remove element at index
  list.splice(index, 1);
  // Return updated list
  return list;
}

function getKeyIndex(o,k)
{
  let count = 0;
  for (const key in o)
  {
    count = count + 1;
    if ( k === key ) return count;
  }
  return -1;
}

function getKeyAtIndex(o,i)
{
  i = parseInt(i);
  let count = 0;
  for (const key in o)
  {
    count = count + 1;
    if ( i === count ) return key
  }
}

function getElementIndex(o,v)
{
  let count = 0;
  for (const key in o)
  {
    count = count + 1;
    if ( o[key] === v ) return count;
  }
  return -1;
}

function getElementAtIndex(o,i)
{
  i = parseInt(i);
  let count = 0;
  for (const key in o)
  {
    count = count + 1;
    if ( i === count ) return o[key];
  }
}

function addMissingElements(obj1, obj2) {
  // loop through the first object
  for (let key in obj1) {
      // check if the key is present in the second object
      if (!obj2.hasOwnProperty(key)) {
          // if not, add it
          obj2[key] = obj1[key];
      }
  }
  // return the modified object
  return obj2;
}

function sumElements(obj1, obj2) {
  // loop through the first object
  for (let key in obj1) {
      // check if the key is present in the second object
      if ( isNumber(obj1[key])  &&  isNumber(obj2[key])  &&  obj2.hasOwnProperty(key)  &&  obj2[key] != null ) {
          // if so, sum into obj2
          obj2[key] = obj1[key] + obj2[key];
      }
      else
      {
        if (isNumber(obj1[key])) obj2[key] = obj1[key];
      }
  }
  // return the modified object
  return obj2;
}

function trimNewlines(str) {
  return str.replace(/^[\r\n]+|[\r\n]+$/g, ''); // removes newlines from the beginning and end of a string.
}

function stripComments(str) {
  // WARNING: This only strips lines that start with // , including the newline after it.
  // It does not strip /* */ commenting or commenting after data on a given line.
  return str.replace(/\r/g,"").replace(/^\/\/[^\n]*[\n]/gm,"").replace(/^\/\/[^\n]*/gm,"").replace(/\/\*[\s\S]*?\*\/[\n]/gm,"").replace(/\/\*[\s\S]*?\*\//gm,"");
}

function fileExists(filePath) {
  try { fs.accessSync(filePath, fs.F_OK); return true; }
  catch (err) { return false; }
}

function fileDelete(filePath) {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) { reject(err); } else { resolve(); }
    });
  });
}

function directoryExists(directoryPath) {
  try { return fs.statSync(directoryPath).isDirectory();}
  catch (err) { return false; }
}

async function waitForFile(filePath,timeout = 60000)
{
  while (timeout > 0)
  {
    timeout = timeout - 500
    if (fileExists(filePath))
    {
      if   (timeout <= 0) return true;
      else timeout = 500;
    }
    await sleep(500);
  }
  return false;
}

function makeDirectory(dirName) {
  if (directoryExists(dirName))  { logTo(`Directory ${dirName} already exists.`); return; }
  fs.mkdir(dirName, (err) => {
    if (err) {
      console.error(err);
    } else {
      logTo(`Directory ${dirName} created successfully!`);
    }
  });
}

const loadObjectFromFile = (filePath,defaultData = "{}") => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8',(err, data) => {
      if (err) {
        const object = JSON.parse(defaultData);
        logTo(err);
        resolve(object);
      } else {
        if (data == "") data = defaultData;
        const object = JSON.parse(data);
        resolve(object);
      }
    });
  });
};

const loadStringFromFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fileExists(filePath)) { console.log("File not found: " + filePath); resolve(""); };
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        logTo(err);
        resolve("");
      } else {
        resolve(data);
      }
    });
  });
};


const loadStringFromFileSync = (filePath,defaultString = "") => {
  try
  {
    const str = fs.readFileSync(filePath, 'utf8');
    return str
  }
  catch (err) { console.log(err); return defaultString; }
}


function saveObjectToFile(obj, fileName, pretty = 0)
{
  fs.writeFile(fileName, JSON.stringify(obj,null,pretty) + `\n`, err => { if (err) console.error(err); });
}

async function mongoInsertOne(mongoUri,collectionName,obj,options)
{
  const dbclient = new MongoClient(mongoUri);

  try {
    await dbclient.connect();
    const database = dbclient.db();
    const collection = database.collection(collectionName);
    const result = await collection.insertOne(obj,options);
    return result;
  } finally {
    dbclient.close();
  }
}


async function mongoFindOne(mongoUri, collectionName, filter, options)
{
  const dbclient = new MongoClient(mongoUri);

  try {
    await dbclient.connect();
    const database = dbclient.db();
    const collection = database.collection(collectionName);
    const result = await collection.findOne(filter,options)
    return result;
  } finally {
    dbclient.close();
  }
}

async function mongoFind(mongoUri, collectionName, filter, options, sort)
{
  const dbclient = new MongoClient(mongoUri);

  try {
    await dbclient.connect();
    const database = dbclient.db();
    const collection = database.collection(collectionName);
    const result = collection.find(filter,options)
    if (sort) result.sort(sort);
    return await result.toArray();
  } finally {
    dbclient.close();
  }
}


async function mongoReplaceOne(mongoUri, collectionName, filter, replacement, options )
{
  if (replacement._id) delete replacement._id;

  const dbclient = new MongoClient(mongoUri);

  try {
    await dbclient.connect();
    const database = dbclient.db();
    const collection = database.collection(collectionName);
    const result = await collection.replaceOne(filter, replacement, options);
    return result;
  } finally {
    dbclient.close();
  }
}


async function mongoCount(mongoUri, collectionName, filter, options )
{
  const dbclient = new MongoClient(mongoUri);

  try {
    await dbclient.connect();
    const database = dbclient.db();
    const collection = database.collection(collectionName);
    const result = await collection.countDocuments(filter, options);
    return result;
  } finally {
    dbclient.close();
  }
}


async function saveObjectToMongoDB(mongoUri,collectionName,filter,obj, options)
{
  if (filter && await mongoFindOne(mongoUri, collectionName, filter)) {
    console.log("// [saveObjectToMongoDB] Replacing existing object")
    return await mongoReplaceOne(mongoUri, collectionName, filter, obj, options);
  } else {
    console.log("// [saveObjectToMongoDB] Inserting new object")
    return await mongoInsertOne(mongoUri, collectionName, obj);
  }
}


async function loadObjectFromMongoDB(mongoUri,collectionName,filter,options)
{
  return await mongoFindOne(mongoUri,collectionName,filter,options);
}


async function updateObjectInMongoDB(mongoUri,collectionName,filter,update,options)
{
  const dbclient = new MongoClient(mongoUri);

  try {
    await dbclient.connect();
    const database = dbclient.db();
    const collection = database.collection(collectionName);
    const result = await collection.updateOne(filter, update, options);
    return result;
  } finally {
    dbclient.close();
  }

}



function copyObject(obj)
{
  try         { return JSON.parse(JSON.stringify(obj)); }
  catch (err) { logTo(err); return obj; };
}


const fileCopy = (source, target) => {
  return new Promise((resolve, reject) => {
    fs.readFile(source, (err, data) => {
      if (err) {
        reject(err);
      } else {
        fs.writeFile(target, data, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
};
/* Usage
  fileCopy('source.txt', 'target.txt')
    .then(() => { console.log('File copied successfully!'); })
    .catch((err) => { console.log('Error copying file:', err); });
*/


async function downloadToFile(url, filePath)
{
  const ht_client = !url.charAt(4).localeCompare('s') ? https : http;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    let fileInfo = null;

    const request = ht_client.get(url, response => {
      if (response.statusCode !== 200) {
        fs.unlink(filePath, () => {
          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        });
        return;
      }

      fileInfo = {
        mime: response.headers['content-type'],
        size: parseInt(response.headers['content-length'], 10),
      };

      response.pipe(file);
    });

    // The destination stream is ended by the time it's called
    file.on('finish', () => resolve(fileInfo));

    request.on('error', err => {
      fs.unlink(filePath, () => reject(err));
    });

    file.on('error', err => {
      fs.unlink(filePath, () => reject(err));
    });

    request.end();
  });
}


async function downloadToBuffer(url)
{
  const ht_client = !url.charAt(4).localeCompare('s') ? https : http;

  return new Promise((resolve, reject) => {
    let buffer;

    const request = ht_client.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }

      // Get the file size so we know how big to make the buffer
      const size = parseInt(response.headers['content-length'], 10);

      // Create a buffer to store the data
      buffer = Buffer.alloc(size);

      let offset = 0;

      // Stream the data into the buffer
      response.on('data', (chunk) => {
        chunk.copy(buffer, offset);
        offset += chunk.length;
      });

      // Resolve the promise when the stream is finished
      response.on('end', () => { resolve(buffer); });
    });

    request.on('error', err => {
      reject(err);
    });

    request.end();
  });
}


const fileMD5sum = (filePath) => {
  const crypto = require("node:crypto");
  const fs = require("node:fs");
  const fileData = fs.readFileSync(filePath);   // Read the file
  const hash = crypto.createHash('md5');   // Create a hash object
  hash.update(fileData); // Update the hash object with the file data
  return hash.digest('hex'); // Return the md5sum
}


//const fileList = (path = "./", filter = "", flags = "gi") =>
function fileList (path = "./", filter = "", flags = "gi")
{
  try
  {
    const files = fs.readdirSync(path);
    if (filter == "") return files;
    const regex_filter = new RegExp(filter,flags);
    return files.filter( file => regex_filter.test(file) );
  }
  catch (err) { console.log(err); return []; }
}


// let r; r = testFunc(10,console.log,["hi"])
// let r; r = testFunc(10,JSON.stringify,[ [1,2,3,4,5,6,7,8,9,10],null,true ])
/**
 * 
 * @param {*} count 
 * @param {*} func 
 * @param {*} args 
 * @returns
 */
function testFunc(count = 1,func, args = [])
{
  const r =
  {
    count:  count,
    func:   func,
    args:   args,
    memory: { start: process.memoryUsage(), end: {}, diff: {}, },
    time:   { start: process.hrtime(),      end: [], elapsed: 0, per_exec: 0, execs_per_second: 0, },
  }

  try
  {
    for (let i = 1; i < count; i++)
    {
      func(...args);
    }
    r.returned = func(...args);
  }
  catch (err) { console.log(err); }

  r.time.end              = process.hrtime();
  r.memory.end            = process.memoryUsage();
  r.time.elapsed          = parseFloat(r.time.end[0] + (r.time.end[1]*0.000000001)) - parseFloat(r.time.start[0] + (r.time.start[1]*0.000000001))
  r.time.per_exec         = r.time.elapsed / count;
  r.time.execs_per_second = parseInt(1/r.time.elapsed*count);
  r.memory.diff           = {};
  for (const k in r.memory.end) r.memory.diff[k] = r.memory.end[k] - r.memory.start[k];

  return r;
}


// function toObject() {
//   return JSON.parse(JSON.stringify(this, (key, value) =>
//       typeof value === 'bigint'
//           ? value.toString()
//           : value // return everything else unchanged
//   ));
// }


/////////////////////////////
// Logging
///////////////////////////

function logTo(mes,toConsole = true,toFile = true) {
  
  if (toConsole)  console.log(mes);

  if (toFile)
  {
    let message_str = ``;
    if (typeof mes === 'string')
      { message_str = mes; }
    else
      { message_str = JSON.stringify(mes,null,2); };
    let curDate = get_date();
    let logFile = `${dirs.logs}/log-${curDate}.txt`;
    fs.appendFile(
      logFile,
      message_str + '\n',
      (err) => { if (err) console.log(err); }
    );
  };
}


function log_user(user)
{
  logTo(`user.bot       ${user.bot}`);
  logTo(`user.username  ${user.username}`);
  logTo(`user.tag       ${user.tag}`);
  logTo(`user.id        ${user.id}`);
  logTo(``);
}


function log_message(message)
{
  try
  {
    logTo(`// message`);
    if (DEBUG_MODE)
    {
      logTo(message);
    }
    else
    {
      logTo(message.content);
    }
  }
  catch (err) { logTo(err); }
}



///////////////////
// Text Templates
/////////////////

async function loadTemplate(fileName,replacements,prefix)
{
  try
  {
    function stripComments(str) { return str.replace(/\r/g,"").replace(/^\/\/[^\n]*[\n]/gm,"").replace(/^\/\/[^\n]*/gm,"").replace(/\/\*[\s\S]*?\*\/[\n]/gm,"").replace(/\/\*[\s\S]*?\*\//gm,""); };
    
    if ( !fileExists(fileName) )
    {
      if (fileExists(dirs.templates_custom + "/" + fileName)) { fileName = dirs.templates_custom + "/" + fileName; }
      else if (fileExists(dirs.templates + "/" + fileName))   { fileName = dirs.templates + "/" + fileName; };
    } 

    let template = await loadStringFromFile(fileName);

    template = stripComments(template);

    if (replacements)
    {
      for (const k in replacements)
      {
        template = template.replaceAll( "${" + k + "}", replacements[k] );
      }
    }

    if (prefix) template.replaceAll( "${prefix}", prefix );
    if (prefix) template.replaceAll( "${p}", prefix );

    return template;
  }
  catch (err)
  {
    logTo("ERROR: During loadTemplate() the following error was encountered with file " + fileName + " and replacements " + JSON.stringify(replacements) + " and prefix " + prefix);
    logTo(err);
    return "";
  }
}


/////////////////////
// Discord Specific
///////////////////

/*
async function discord_function_template()
{
  try
  {
    
  }
  catch (err)
  {
    logTo("ERROR: During discord_function_template() the following error was encountered");
    logTo(err);
  }
}
*/

function discord_create_link(guildId,channelId,messageId,text)
{
  // https://discord.com/channels/1189051296221765692/1189051296221765696/1215106554978631680
  // https://discord.com/channels/@me/1056070961344041032/1215151597697638440

  if (!guildId) guildId = "@me"
  return `[${text}](https://discord.com/channels/${guildId}/${channelId}/${messageId})`;
}


async function discord_get_message(channelId,messageId)
{
  try
  {
    const channel = await client.channels.fetch(channelId);
    const messages = await channel.messages.fetch(parseInt(messageId));
    // Find message by messageId
    const message  = messages.find(m => m.id == messageId);
    return message;
  }
  catch (err)
  {
    logTo("ERROR: During discord_get_message() the following error was encountered");
    logTo(err);
    return null;
  }
}


async function discord_edit_message(channelId,messageId,payload)
{
  logTo("// [discord_edit_message] channelId " + channelId + " messageId " + messageId + " payload " + JSON.stringify(payload));
  try
  {
    const message  = await discord_get_message(channelId,messageId);
    return await message.edit(payload);
  }
  catch (err)
  {
    logTo("ERROR: During discord_edit_message() the following error was encountered");
    logTo(err);
    return false
  }
}


/**
 * 
 * @param {string} content
 * @param {number} length
 */
function discord_shorten_content(content,length = 2000,separator = "...\n")
{
  if (typeof content != "string") return "";
  if (content.length <= length) return content;
  const length_half = parseInt((length-separator.length)/2);
  return content.substring(0,length_half) + separator + content.substring(content.length-length_half);
}


function discord_create_embed(returnOnlyEmbed = true,setColor=0x009FFF,content,setAuthor,setAuthor_iconURL,setAuthor_url,setTitle,setURL,setDescription,setThumbnail,addFields,setImage,setTimestamp,setFooter,setFooter_iconURL,components)
{
  const result = {};
  const e = new EmbedBuilder()
  if (setColor)       e.setColor(setColor)
  if (!setColor)      e.setColor(0x009FFF)
  if (setAuthor)      e.setAuthor({ name: setAuthor.substring(0,256), iconURL: setAuthor_iconURL, url: setAuthor_url })
  if (setTitle)       e.setTitle(setTitle)
  if (setURL)         e.setURL(setURL)
  if (setDescription) e.setDescription(setDescription.substring(0,3072))
  if (setThumbnail)   e.setThumbnail(setThumbnail)
  if (addFields)      e.addFields(...addFields)
  if (setImage)       e.setImage(setImage)
  if (setTimestamp)   e.setTimestamp()
  if (setFooter)      e.setFooter({ text: setFooter.substring(0,1024), iconURL: setFooter_iconURL });
  result.content = content;
  result.embeds = [e];
  if (components) result.components = components;
  // if (buttons)
  // {
  //   const components = [];

  //   for (const b of buttons)
  //   {
  //     const comp = new ButtonBuilder()
  //       .setCustomId(b.customId)
  //       .setLabel(b.label)
  //       .setStyle(b.style);
  //     components.push( comp)
  //   }
  //   if (components.length > 0) result.components = [new ActionRowBuilder().addComponents(...components)];
  // }

  //return { content: content, embeds: [e] };
  return result;
  // e.setAuthor({ name: 'setAuthor 256 characters max', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
  // e.setTitle('setTitle 256 bytes max')
  // e.setURL('https://discord.js.org/')
  // e.setDescription('setDescription 4096 characters max')
  // e.setThumbnail('https://i.imgur.com/AfFp7pu.png')
  // e.addFields(
  //   { name: 'name 256 characters max', value: 'value 1024 characters max' },
  //   { name: '\u200B', value: '\u200B' }, // space
  //   { name: 'name 256 characters max', value: 'value 1024 characters max', inline: true },
  //   { name: 'name 256 characters max', value: 'value 1024 characters max', inline: true },
  // )
  // .addFields({ name: 'name 256 characters max', value: 'value 1024 characters max', inline: true })
  // e.setImage('https://i.imgur.com/AfFp7pu.png')
  // e.setTimestamp()
  // e.setFooter({ text: 'setFooter 2048 characters max', iconURL: 'https://i.imgur.com/AfFp7pu.png' });
}


async function discord_create_channel(guildId,channelName,channelType = ChannelType.GuildText)
{
  try
  {
    const guild   = await client.guilds.fetch(guildId);
    const channel = await guild.channels.create({ name: channelName, type: channelType, parent: channelParent });
    return channel;
  }
  catch (err)
  {
    logTo("ERROR: During discord_create_channel() the following error was encountered");
    logTo(err);
    return null;
  }
}


/**
 * 
 * @param {*} channelId 
 * @param {*} threadName 
 * @param {*} threadType 
 * @param {*} reason 
 * @param {*} autoArchiveDuration 
 * @returns {ThreadChannel}
 */
async function discord_create_thread(channelId,threadName,threadType = ChannelType.PublicThread,reason,autoArchiveDuration = 60)
{
  try
  {
    const channel = await client.channels.fetch(channelId);
    let   thread  = await channel.threads.cache.find(x => x.name === threadName);
    if (!thread) thread = await channel.threads.create( { name: threadName,  type: threadType, reason: reason, autoArchiveDuration: autoArchiveDuration } );
    return thread;
  }
  catch (err)
  {
    logTo("ERROR: During discord_create_thread() the following error was encountered");
    logTo(err);
    return null;
  }
}


async function discord_load_slash_commands()
{
  try
  {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command)
      {
        logTo("Loaded command " + command.data.name);
        client.commands.set(command.data.name, command);
      }
      else
      {
        logTo(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }
  catch(err)
  {
    logTo("ERROR: During discord_load_slash_commands() the following error was encountered");
    logTo(err);
  }
}


/**
 * 
 * @param {AIUser} aiuser
 * @param {AICard} card
 * @param {boolean} setImage
 * @param {number} pageNumber
 * @returns 
 */
async function discord_character_card_embed(aiuser,card,setImage,pageNumber = 1, pageMax)
{
  try
  {
    logTo(`// [discord_character_card_embed] chat_profile`)
    setImage = true;
    const chat_profile = await getAIChatProfile(aiuser);
    const card_user    = await getAICard(chat_profile.cardId_user);
    const user_name    = ( card_user && card_user.data && card_user.data.name ) || chat_profile.user;
    if (!card.data.name) card.data.name = "Unnamed Character"
    card.data = cCards.detokenize_object( card.data, {"{{user}}": user_name, "{{char}}": card.data.name} )
    let url;
    if (card.data.extensions && card.data.extensions.discord && card.data.extensions.discord.image_url) url = card.data.extensions.discord.image_url;
    if (card.image_url) url = card.image_url;
    const pages =
    [
      "# " + card.data.name + "\n## Description\n"               + discord_shorten_content( card.data.description               || "Empty", 3072 ),
      "# " + card.data.name + "\n## First Message\n"             + discord_shorten_content( card.data.first_mes                 || "Empty", 3072 ),
      "# " + card.data.name + "\n## Personality\n"               + discord_shorten_content( card.data.personality               || "Empty", 3072 ),
      "# " + card.data.name + "\n## Scenario\n"                  + discord_shorten_content( card.data.scenario                  || "Empty", 3072 ),
      "# " + card.data.name + "\n## System Prompt\n"             + discord_shorten_content( card.data.system_prompt             || "Empty", 3072 ),
      "# " + card.data.name + "\n## Post History Instructions\n" + discord_shorten_content( card.data.post_history_instructions || "Empty", 3072 ),
      "# " + card.data.name + "\n## Creator Notes\n"             + discord_shorten_content( card.data.creator_notes             || "Empty", 3072 ),
    ]
    if (pageNumber == null || pageNumber > pages.length) pageNumber = 1
    if (pageNumber < 1) pageNumber = pages.length
    if (setImage == null && pageNumber == 1) setImage = true;
    const embed = new EmbedBuilder();
    embed.setColor(0x009FFF)
    if (url && !setImage)       embed.setThumbnail(url);
    if (pages[pageNumber-1])    embed.setDescription(pages[pageNumber-1])
    if (setImage && url)        embed.setImage(url)
    let footer = ""
    if (pageMax) footer = `Card ${pageNumber} of ${pageMax}`
    if (card.data.creator) footer = footer + "   card created by " + card.data.creator;
    if (footer)      embed.setFooter({ text: "card created by " + card.data.creator });
    //embed.setTimestamp()

    let set_as_user_style = ButtonStyle.Primary; if (card.cardId == chat_profile.cardId_user) set_as_user_style = ButtonStyle.Success;
    let set_as_bot_style  = ButtonStyle.Primary; if (card.cardId == chat_profile.cardId_bot)  set_as_bot_style  = ButtonStyle.Success;

    const prev_prop = new ButtonBuilder()
			.setCustomId('card-properties_' + aiuser.aiId + "_" + card.cardId + "_" + (pageNumber-1))
			.setLabel('< Prop')
			.setStyle(ButtonStyle.Secondary);

		const next_prop = new ButtonBuilder()
			.setCustomId('card-properties_' + aiuser.aiId + "_" + card.cardId + "_" +  (pageNumber+1))
			.setLabel('Prop >')
			.setStyle(ButtonStyle.Secondary);

    const as_user = new ButtonBuilder()
      .setCustomId('set-as-user_' + aiuser.aiId + '_' + card.cardId)
      .setLabel('Set as My Card')
      .setStyle(set_as_user_style);

      const as_bot = new ButtonBuilder()
      .setCustomId('set-as-bot_' + aiuser.aiId + '_' + card.cardId)
      .setLabel("Set as Bot's Card")
      .setStyle(set_as_bot_style);

      const new_chat = new ButtonBuilder()
      .setCustomId('start-new-chat_' + aiuser.aiId + '_' + card.cardId)
      .setLabel("Start New Chat")
      .setStyle(ButtonStyle.Primary);

      const prev_card = new ButtonBuilder()
			.setCustomId('card-prev_' + aiuser.aiId + "_" + card.cardId)
			.setLabel('< Card')
			.setStyle(ButtonStyle.Secondary);

		const next_card = new ButtonBuilder()
			.setCustomId('card-next_' + aiuser.aiId + "_" + card.cardId)
			.setLabel('Card >')
			.setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(as_user,   as_bot,    new_chat);
      const row2 = new ActionRowBuilder().addComponents(prev_prop, next_prop, prev_card, next_card);

    return { content: "", embeds: [embed], components: [row1,row2] };
  }
  catch (err) { logTo("// [discord_character_card_embed] ERROR"); logTo(err); }
}


/////////////
// AIUser
///////////


async function getAIUser(discordUser,guildId,channelId)
{
  const filter = {"discordId": discordUser.id, "guildId": guildId}
  let aiuser = await mongoFindOne( MONGO_URI, "users", filter );
  if (aiuser) aiuser = new AIUser(aiuser);
  if (aiuser != null) await updateAILastSeen(aiuser,discordUser,channelId);
  if (aiuser == null) aiuser = await newAIUser(aiuser,discordUser,guildId,channelId);
  if (aiuser != null) aiuser.channelId = channelId;
  if (aiuser != null) return new AIUser(aiuser);
}


async function getAIUserById(aiId)
{
  const filter = {"aiId": aiId}
  let   aiuser = await mongoFindOne( MONGO_URI, "users", filter );
  if (aiuser == null) { logTo("// [getAIUserById] aiuser not found for aiId " + aiId); return };
  aiuser = new AIUser(aiuser);
  console.log(aiuser)
  return aiuser;
}


async function updateAILastSeen(aiuser,discordUser,channelId)
{
  await updateObjectInMongoDB(
    MONGO_URI,
    "users",
    {aiId: aiuser.aiId},
    {
      $set:
      {
        last_seen: Date.now(),
        channelId: channelId,
        discordUser: discordUser,
        interaction_count: ( aiuser.interaction_count || 0 ) + 1
      }
    }
  );
}


async function updateAIUserUsage(aiuser,usageType,modelType,usage)
{
  const aiuser_now = await mongoFindOne( MONGO_URI, "users", {aiId: aiuser.aiId} );
  if (aiuser_now == null) return;
  if (aiuser_now.usage[usageType] == null) aiuser_now.usage[usageType] = {};
  if (aiuser_now.usage[usageType][modelType] == null) aiuser_now.usage[usageType][modelType] = {};
  sumElements(usage,aiuser_now.usage[usageType][modelType]);
  await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, {$set: {usage: aiuser_now.usage}} );
}


function isAIChatChannelActive(aiuser,channelId)
{
  return aiuser.active_channels.includes(channelId)
}


async function toggleAIChatChannelActive(aiuser,channelId,active)
{
  if (active == null) active = !aiuser.active_channels.includes(channelId);
  if (active && !aiuser.active_channels.includes(channelId)) aiuser.active_channels.push(channelId);
  if (!active && aiuser.active_channels.includes(channelId)) removeListElement(aiuser.active_channels,channelId);
  await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, {$set: {active_channels: aiuser.active_channels}} );
  return aiuser.active_channels.includes(channelId);
}


async function toggleAIChatMemoryActive(aiuser,active)
{
  const chat_profile = await getAIChatProfile(aiuser);
  if (active == null) active = !chat_profile.memory_enabled;
  if (active) {active = true} else {active = false};
  await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: {memory_enabled: active}} );
  return true
}


async function newAIUser(aiuser,discordUser,guildId,channelId)
{
  if (discordUser.bot) return;

  const result          = new AIUser();
  result.discordId      = discordUser.id;
  result.guildId        = guildId;
  result.discordUser    = discordUser;
  result.channelId      = channelId;

  // If the message is not in a guild (server) then it's a DM and we should automatically add the channel to the active_channels list.
  if (!guildId) result.active_channels.push(channelId);

  if (channelId) await saveObjectToMongoDB( MONGO_URI, "users", {aiId: result.aiId}, result );
  
  return await mongoFindOne( MONGO_URI, "users", { "aiId": result.aiId } );
}


async function updateAIUser(aiuser,update)
{
  if (typeof update != "object" || !update) return false;
  return await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, update );
}


async function setAIChatProfile(aiuser,channelId,chatId)
{
  logTo("// [setAIChatProfile] for aiId:" + aiuser.aiId + " and channelId:" + channelId + " and chatId:" + chatId)
  const payload = {$set:{}}
  payload.$set["channel_settings." + channelId + ".chatId"] = chatId;
  await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, payload );
}


async function newAIChatProfile(aiuser,channelId)
{
  logTo("// [newAIChatProfile] for aiId:" + aiuser.aiId + " and channelId:" + channelId)
  const result          = new AIChatProfile();
  result.aiId           = aiuser.aiId;
  result.chatName       = get_date("-")
  result.channelId      = channelId;
  result.user           = aiuser.discordUser.globalName;
  result.memory_enabled = true;
  result.cardId_bot     = aiuser.last_cardId_bot  || "DEFAULT-BOT-CARD";
  result.cardId_user    = aiuser.last_cardId_user || "DEFAULT-USER-CARD";
  await saveObjectToMongoDB( MONGO_URI, "chat_profiles", {chatId: result.chatId}, result );
  aiuser.channel_settings[channelId].chatId = result.chatId;
  await setAIChatProfile(aiuser,channelId,result.chatId);
  return result;
}


async function getAIChatProfile(aiuser,channelId,chatId,createIfNotExist = true)
{
  if (!channelId) channelId = aiuser.channelId;
  console.log("// [getAIChatProfile] for " + aiuser.aiId)
  const cur_aiuser = await mongoFindOne( MONGO_URI, "users", {"aiId": aiuser.aiId} );
  if (!chatId)
  {
    if (!cur_aiuser.channel_settings) cur_aiuser.channel_settings = {};
    if (!cur_aiuser.channel_settings[channelId]) cur_aiuser.channel_settings[channelId] = {};
    if (cur_aiuser.channel_settings[channelId].chatId) chatId = cur_aiuser.channel_settings[channelId].chatId;
  }
  let chat_profile
  if (chatId) chat_profile = await mongoFindOne( MONGO_URI, "chat_profiles", {chatId: chatId} );
  if (chat_profile == null && createIfNotExist) chat_profile = await newAIChatProfile(cur_aiuser,channelId);
  return new AIChatProfile(chat_profile);
}


async function getAIChatProfiles(aiId,channelId)
{
  console.log("// [getAIChatProfiles] for aiId: " + aiId + " and channelId: " + channelId)
  const filter     = {"aiId": aiId, "channelId": channelId}
  const sort       = {chatName: 1}
  return await mongoFind( MONGO_URI, "chat_profiles", filter, null, sort );
}


async function getAICards(aiId,includePublic = true)
{
  try {
    logTo(`// [getAICards] Begin - aiId: ${aiId} includePublic: ${includePublic}`)
    let filter = {$or:[]};
    if (aiId) filter["$or"].push({ aiId: aiId });
    if (includePublic) filter["$or"].push({ aiId: "PUBLIC" });
    const result = await mongoFind( MONGO_URI, "cards", filter, null, {cardName: 1} );
    if (result)
    {
      for (let key in result) result[key] = new AICard(result[key]);
    }
    return result;
  }
  catch (err) { logTo(err); }
}


async function getAICard(aiId,cardName)
{
  logTo("// [getAICard] Begin - aiId: " + aiId + " cardName: " + cardName)
  let result = await mongoFindOne( MONGO_URI, "cards", {aiId: aiId, cardName: cardName} );
  if (result) result = new AICard(result);
  return result;
}


/**
 * 
 * @param {string} cardId
 * @returns {AICard}
 */
async function getAICardById(cardId)
{
  logTo("// [getAICardById] Begin - cardId: " + cardId)
  let result = await mongoFindOne( MONGO_URI, "cards", {cardId: cardId} );
  if (result) return new AICard(result);
}


async function importAICharacterCard_v2(aiuser,card,image_url)
{
  try
  {
    logTo("// [importAICharacterCard_v2] Begin")
    const new_card = new TavernCardV2(card)
    let cardName = new_card.data.name;
    if (!cardName) return false;
    if (new_card.data.character_version) cardName = cardName + " - " + new_card.data.character_version;
    const aicard = await getAICard(aiuser.aiId,cardName) || new AICard({aiId: aiuser.aiId, cardName: cardName, image_url: image_url, data: new_card.data});
    aicard.image_url = image_url;
    await saveObjectToMongoDB( MONGO_URI, "cards", {cardId: aicard.cardId}, aicard );
    logTo("// [importAICharacterCard_v2] Returning aicard")
    return aicard;
  }
  catch (err) { logTo("// [importAICharacterCard_v2] ERROR"); logTo(err); return false; }
}



async function pushAIChatMessages(aiuser,messages,messageIds)
{
  try
  {
    logTo("// [pushAIChatMessages]")
    const chat_profile = await getAIChatProfile(aiuser);
    if (!chat_profile.memory_enabled) return;
    if (messages.length != messageIds.length)
    {
      logTo("// [pushAIChatMessages] ERROR: messages.length (" + messages.length + ") != messageIds.length (" + messageIds.length + ") Aborting without saving.")
      logTo({messages,messageIds})
      return;
    }
    for (const message   of messages)   await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$push: {messages: message}} );
    for (const messageId of messageIds) await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$push: {messageIds: messageId}} );
  }
  catch (err) { logTo(err); }
}


/**
 * 
 * @param {AIUser} aiuser 
 * @param {number} pop_value - -1 to pop first entry, 1 to pop last entry
 * @returns 
 */
async function popAIChatMessages(aiuser,pop_value=1)
{
  try
  {
    logTo("// [pushAIChatMessages]")
    const chat_profile = await getAIChatProfile(aiuser);
    if (!chat_profile.memory_enabled) return;
    if (chat_profile.messages.length != chat_profile.messageIds.length)
    {
      logTo("// [pushAIChatMessages] ERROR: messages.length (" + chat_profile.messages.length + ") != messageIds.length (" + chat_profile.messageIds.length + ") Aborting without saving.")
      logTo({messages: chat_profile.messages, messageIds: chat_profile.messageIds})
      return;
    }
    
    await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$pop: {messages: pop_value}} );
    await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$pop: {messageIds: pop_value}} );
  }
  catch (err) { logTo(err); }
  return true
}


async function clearAIChatMessages(aiuser)
{
  const chat_profile = await getAIChatProfile(aiuser);
  chat_profile.messages   = [];
  chat_profile.messageIds = [];
  await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: {messages:   chat_profile.messages}} );
  await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: {messageIds: chat_profile.messageIds}} );
}


async function getAIMessages(aiuser,chat_profile,content,role = "user",name)
{
  let messages = [];
  let new_messages = [];
  if (!chat_profile) chat_profile = await getAIChatProfile(aiuser);
  if (chat_profile.prompt)              messages.push( { role: "system", content: chat_profile.prompt } );
  if (chat_profile.messages.length > 0) messages = messages.concat(chat_profile.messages);
  if (content)                          messages.push(     { name: name, role: role, content: content } );
  if (content)                          new_messages.push( { name: name, role: role, content: content } );
  const messages_byte_count = cCards.get_byte_count(messages,["content"]);
  logTo("// [getAIMessages] - messages_byte_count: " + messages_byte_count + " tokens: " + parseInt(messages_byte_count/3.90) );
  return {messages,new_messages,messages_byte_count};
}


/**
 * @param   {AIUser} aiuser - The path to the input PNG file.
 * @returns {object} messages in OpenAI API format.
 */
async function buildAIChatMessages(aiuser,chat_profile,content,role = "user",name)
{
  // Prompt Order //
  // system_prompt
  // bot_description
  // bot_personality
  // nsfw_prompt aka jailbreak_1
  // mes_example
  // start_new_chat
  // first_mes
  // user_message
  // post_history_instructions aka jailbreak_2

  let messages = [];
  const new_messages = [];
  //const chat_profile = await getAIChatProfile(aiuser)
  if (!chat_profile) chat_profile = await getAIChatProfile(aiuser);
  if (!chat_profile || !chat_profile.cardId_bot)
  {
    logTo("// [buildAIChatMessages] NOTE: chat_profile or chat_profile.cardId_bot is null. calling [getAIMessages] instead.")
    return await getAIMessages(aiuser,chat_profile,content,role,name);
  }
  logTo("// [buildAIChatMessages] NOTE: chat_profile.cardId_bot exists. Processing card data.")

  const card_bot  = await getAICardById(chat_profile.cardId_bot);
  const card_user = await getAICardById(chat_profile.cardId_user);

  if (!name) name = (card_user && card_user.data && card_user.data.name) || chat_profile.user;
  if (!card_bot.data.name) card_bot.data.name = "T4D"

  if (!card_bot.data.system_prompt)             card_bot.data.system_prompt = DEFAULT_CHAT_SYSTEM_PROMPT;

  //if (!card_bot.data.post_history_instructions) card_bot.data.post_history_instructions = app_config.DEFAULT_CHAT_JAILBREAK_2;

  // system_prompt
  if (card_bot.data.system_prompt)          messages.push( { role: "system", content: card_bot.data.system_prompt } );
  // bot_description
  if (card_bot.data.description)            messages.push( { role: "system", content: card_bot.data.description   } );
  // bot_personality
  if (card_bot.data.personality)            messages.push( { role: "system", content: card_bot.data.personality   } );
  // mes_example
  if (card_bot.data.mes_example)            messages = messages.concat(cCards.mes_example_to_openai(card_bot.data.mes_example));
  // start_new_chat
  messages.push( { role: "system", content: "[Start a new Chat]" } );
  // first_mes
  if (!chat_profile.memory_enabled && card_bot.data.first_mes) messages.push( { name: card_bot.data.name, role: "assistant", content: card_bot.data.first_mes } );
  // Detokenize messages
  cCards.detokenize_object( messages, {"{{user}}": name, "{{char}}": card_bot.data.name} )
  // Memory
  if (chat_profile.memory_enabled && chat_profile.messages.length > 0) messages = messages.concat(chat_profile.messages);
  // user_message
  if (content)                              messages.push(     { name: name, role: role, content: content } );
  if (content)                              new_messages.push( { name: name, role: role, content: content } );
  // post_history_instructions
  if (card_bot.data.post_history_instructions) messages.push( { role: "system", content: cCards.detokenize_object( card_bot.data.post_history_instructions, {"{{user}}": name, "{{char}}": card_bot.data.name} ) } );

  const messages_byte_count = cCards.get_byte_count(messages,["content"]);
  logTo("// [buildAIChatMessages] - messages_byte_count: " + messages_byte_count + " tokens: " + parseInt(messages_byte_count/3.6) );

  return {messages, new_messages, messages_byte_count};
}


async function updateAIImageHistory(aiuser,args,file_output,revised_prompt)
{
  logTo("// [updateAIImageHistory]")
  if (args)           await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, {$set: {"last_image_prompt": args}} );
  if (file_output)    await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, {$set: {"last_image_file": file_output}} );
  if (revised_prompt) await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, {$set: {"last_image_prompt_revised": revised_prompt}} );
}


function getAttachmentText(message)
{
  let result = "";
  for (const [key, value] of message.attachments)
  {
    if (value.attachment != null) result = result + value.attachment + "\n";
  };
  result = trimNewlines(result);
  return result;
}


function getMessageContent(message, separator = "\n\n" )
{
  let content = message.content;
  let attachmentText = getAttachmentText(message);
  if (attachmentText != "")
  {
    if (content == "")
      { content = attachmentText; }
    else
      { content = content + separator + attachmentText; };
  };
  return content;
}


function splitResponse(response,maxBytes = 2000)
{
  let responseObj = [];
  let chunk = "";
  for (let line of response.split("\n"))
  {
    if ( chunk.length + line.length < maxBytes )
    {
      chunk = chunk + line + "\n";
    }
    else
    {
      if (chunk) responseObj.push(chunk.substring(0,maxBytes-1) + "\n");
      chunk = line + "\n";
    }
  };
  // if (chunk.length > 1) responseObj[responseObj.length] = chunk.substring(0,chunk.length-1);
  if (chunk) responseObj.push(chunk.substring(0,maxBytes));
  return responseObj;
}


function handleBackticks(content,max_len = 2000)
{
  if (content.length == 0 || content.length > max_len-4) return content;
  if (content.match(/```/g) && content.match(/```/g).length % 2 == 0) return content.substring(0,max_len);
  if (content.match(/```/g) && content.match(/```/g).length % 2 == 1)
  {
    if (content.match(/```$/) || content.match(/```\n$/)) return "```\n" + content.substring(0,max_len-4);
    return content.substring(0,max_len-4) + "\n```";
  }
  return "```\n" + content.substring(0,max_len-8) + "\n```";
}



/**
 * 
 * @param {Message} message 
 * @param {string}  response 
 * @param {object}  reactions 
 * @returns 
 */
async function respondMessage( message, response, reactions )
{
  if ( response == null ) { logTo("// [respondMessage] ERROR: response is null");  return; }
  
  const messages = [];
  const messageIds = [];
  const urls = [];
  const results = {messages,messageIds,urls};

  if (typeof response == "object")
  {
    try
    {
      logTo("// [respondMessage]: message.channel.send - object");
      //const result = await message.channel.send(response);
      let result
      if (message.type == 2) {
        response.ephemeral = true;
        result = await message.editReply(response);
      }
      else
      {
        result = await message.channel.send(response);
      }
      logTo("// [respondMessage]: message.channel.send - object - result");
      console.log(result)
      messageIds.push(result.id);
      messages.push(result);
      if (result.attachments) result.attachments.map(attachment => urls.push({name: attachment.name, url: attachment.url}));
      if (reactions) for (const reaction of reactions) { console.log("// [respondMessage]: result.react(\"" + reaction + "\")"); console.log(await result.react(reaction)); }
      return results;
    }
    catch (err)
    {
      logTo(err);
      return;
    }
  }
  else if (typeof response == "string")
  {
    for ( let part of splitResponse(response, 2000 ) )
    {
      try
      {
        logTo("// [respondMessage]: message.channel.send - string");
        let result
        //part = handleBackticks(part,2000);
        if (message.type == 2)
        {
          result = await message.editReply( { content: part.substring(0,2000), ephemeral: true } );
        }
        else
        {
          result = await message.channel.send( { content: part.substring(0,2000) } );
        }
        logTo("// [respondMessage]: message.channel.send - string - result");
        console.log(result)
        messageIds.push(result.id);
        messages.push(result);
        if (result.attachments) result.attachments.map(attachment => urls.push({name: attachment.name, url: attachment.url}));
        if (reactions)
        {
          for (const reaction of reactions)
          {
            console.log("// [respondMessage]: result.react(\"" + reaction + "\")");
            console.log( await result.react(reaction) );
          }
        }
      }
      catch (err)
      {
        logTo(err); return;
      };
    };
    return results;
  }
}


/**
 * routeDiscordMessage
 * 
 * @param {Message} message
 * @returns 
 */
async function routeDiscordMessage(message)
{
  try
  {
    logTo("//////////////////////\n// routeDiscordMessage\n//////////////////////");

    // Load the AIUser from the database.
    const aiuser = await getAIUser(message.author,message.guildId,message.channelId);

    // Get the content of the discord message, including any attachments (urls).
    let content  = getMessageContent(message);

    // Log brief details about the user
    log_user(message.author);

    // If message is from a bot return (...for now)
    if (message.author.bot)  { logTo("// [routeDiscordMessage] message.author.bot is true.  Returning."); return;  };

    if (!ALLOW_DIRECT_MESSAGES && !message.guildId) { logTo("// [routeDiscordMessage] ALLOW_DIRECT_MESSAGES is false. Direct messages are not allowed.  Returning."); return;}

    // If message is sent to @silent and IGNORE_SILENT_MESSAGES is true, return
    // we can tell when a message is silent by checking the flags bitfield for 4096
    if (IGNORE_SILENT_MESSAGES && (message.flags.bitfield & 4096) == 4096) { logTo("// [routeDiscordMessage] Ignoring silent message."); return; };

    // Log the message
    log_message(message);

    //if (message.channel.type != ChannelType.GuildText || aiuser.active_channels.includes(message.channelId))
    if (aiuser.active_channels.includes(message.channelId))
    {
      if (IGNORE_MESSAGES_AT_OTHERS && ( content.match(/^@here/g) || content.match(/^@everyone/g) || content.match(/^<@[0-9][0-9]*>/g) ) && (!content.match(new RegExp(`<@${client.user.id}>`, "i"))) ) { logTo("// [routeDiscordMessage] Ignoring @here or @everyone message."); return; };
      // Let the user know we have received the message
      await message.channel.sendTyping();
    }
    else if (content.match(new RegExp(`<@${client.user.id}>`, "i")))
    {
      content = `${aiuser.command_prefix}activate`
    }

    // If content is a discord url with no other data, change content to "!import url"
    if (content.match(/^https:\/\/cdn\.discordapp\.com\/attachments\/[^ ]*\.png[^ ]*$/i)) content = aiuser.command_prefix + "import " + content;
    
    // If the first character of input is the prefix for commands, route the message to handle_Commands and return.
    if (content.substring(0,aiuser.command_prefix.length) == aiuser.command_prefix )
    {
      //logTo("// routeMessage - Found Command prefix `" + prefix + "` in content: " + content);
      logTo("// [routeMessage] -> handle_Commands");
      await handle_Commands(aiuser,message,content);
    }
    // // Else, if the first 5 characters are literally "!help", route the message to handle_Commands to show the user their command prefix
    // else if (content.toLowerCase().substring(0,5) == "!help")
    // {
    //   await handle_Commands(aiuser,message,aiuser.command_prefix + "help");
    // }
    // Else, if the channel is active, route the message to handle_ChatMessage and return
    //else if ( message.channel.type != ChannelType.GuildText || aiuser.active_channels.includes(message.channelId) )
    else if ( aiuser.active_channels.includes(message.channelId) )
    {
      logTo("// [routeMessage] -> handle_ChatMessage");
      await handle_ChatMessage(aiuser,message,content);
    };

  }
  catch (err)
  {
    logTo(err);
  }
}


/**
 * 
 * @param {AIUser} aiuser 
 * @param {Message} message 
 * @param {string} content 
 * @returns 
 */
async function handle_ChatMessage(aiuser,message,content)
{
  logTo("// [handle_ChatMessage] Begin");  // Pretty print function header to log

  let response; // String to store response

  let gptResponse; // Object to store response from OpenAI

  const chat_profile = await getAIChatProfile(aiuser);

  const card_user    = await getAICardById(chat_profile.cardId_user);
  const card_bot     = await getAICardById(chat_profile.cardId_bot);

  const user_name    = ( card_user && card_user.data && card_user.data.name ) || chat_profile.user;

  let reactions  //  = ["❌","🔁"];

  // If the current profile does not have a card, then import the default card.
  if (!card_bot || !card_bot.data)
  {
    logTo("// [handle_ChatMessage] User does not have a card.  Redirecting to command_import_card.")
    return await respondMessage( message, await command_import_card(aiuser,message,"",[]), reactions );
  }

  // Send first_mes - if card is enabled and memory is enabled and no messages have been sent yet.
  if (card_bot.data.name && card_bot.data.first_mes && chat_profile.memory_enabled && chat_profile.messages.length == 0)
  {
    logTo("// [handle_ChatMessage] User has a card and has not sent any messages yet.  Sending first_mes.")
    if (card_bot.data.first_mes)
    {
      const first_mes = cCards.detokenize_object( card_bot.data.first_mes, {"{{user}}": user_name, "{{char}}": card_bot.data.name} );
      // Send first_mes to user
      const r = await respondMessage(message,first_mes,reactions);
      if (r && r.messageIds && r.messageIds.length > 0) await pushAIChatMessages(aiuser,[{name: card_bot.data.name, role: 'assistant', content: first_mes}],[r.messageIds]); // Save to AI user messages history
      return;
    }
  }

  // If content exists, handle with OpenAI request.
  if (content)
  {
    logTo("// [handle_ChatMessage] - content: " + content);

    const messageIds = [ [message.id] ]; // Add the users message.id to the messageIds array

    const  openai_request = new OpenAIChatRequest(aiuser.chat_settings);

    if (DEFAULT_MAX_NEW_TOKENS) openai_request.max_tokens = DEFAULT_MAX_NEW_TOKENS;

    const msgobj = await buildAIChatMessages(aiuser,chat_profile,content,"user",user_name);
    const new_messages = msgobj.new_messages;

    // logTo("// [handle_ChatMessage] - messages:");
    // logTo(msgobj.messages);

    openai_request.messages = msgobj.messages;

    openai_request.model = DEFAULT_CHAT_MODEL || "mixtral-8x7b-32768"; //  "llama2-70b-4096"   "gpt-3.5-turbo"

    logTo("// [handle_ChatMessage] - openai_request:");
    logTo(openai_request);

    try {
      logTo("// [handle_ChatMessage] openai.chat.completions.create");
      gptResponse = await openai.chat.completions.create(openai_request);
      logTo(gptResponse);
      //logTo(gptResponse.choices[0].message);
    }
    catch (err) {
      logTo(err);
      response = "An error occurred while trying to contact the mothership (while trying to make a chat completion).  Just letting you know...\n\n```\n" + JSON.stringify((err.error || err),null,2) + "```\n";
      await respondMessage(message,response); // Send response back to user
      return;
    }

    response = trimNewlines(gptResponse.choices[0].message.content);

    if (response.length > CHAT_RESPONSE_MAX_BYTES)
    {
      console.log(`// [handle_ChatMessage] response.length (${response.length}) > CHAT_RESPONSE_MAX_BYTES (${CHAT_RESPONSE_MAX_BYTES})`);
      response = splitResponse(response,CHAT_RESPONSE_MAX_BYTES)[0];
      gptResponse.choices[0].message.content = response;
    }

    if (card_bot.data.name) gptResponse.choices[0].message.name = card_bot.data.name;

    msgobj.new_messages.push( new OpenAIMessage(gptResponse.choices[0].message) );

    if (!response)
    {
      logTo("// [handle_ChatMessage] gptResponse.data.choices[0].message.content is empty.");
      response = "I... don't know how to respond to that...";
      await respondMessage(message,response); // Send response back to user
      return;
    };

    // Send response back to user
    //const result = await respondMessage(message,handleBackticks(response,2000)); // Send response back to user
    const result = await respondMessage(message,response); // Send response back to user

    if (result == null)
    {
      logTo("// [handle_ChatMessage] Error in handle_ChatMessage: respondMessage() result is null.");
      response = "Error in handle_ChatMessage: respondMessage() result is null";
      await respondMessage(message,response); // Send response back to user
      return;
    };

    //if (result.messages.length > 0) result.messages[result.messages.length-1].message.react("🔁");

    messageIds.push(result.messageIds); // Add the response messageIds to the messageIds array

    await pushAIChatMessages(aiuser,new_messages,messageIds); // Save to AI user messages history

    logTo("// [handle_ChatMessage] gptResponse.usage");
    logTo(gptResponse.usage);
    if (gptResponse && gptResponse.usage) await updateAIUserUsage(aiuser,"text",openai_request.model,gptResponse.usage); // Add usage to DB.
    logTo("// [handle_ChatMessage] aiuser.usage");
    logTo(aiuser.usage);
  }
}


/**
 * 
 * @param   {AIUser}  aiuser 
 * @param   {Message} message 
 * @param   {string}  args 
 * @param   {Array}   argslist 
 * @returns {string}
 */
async function command_command_prefix_set(aiuser,message,args,argslist)
{
  logTo("// [command_command_prefix_set]");
  const result = await updateAIUser(aiuser,{ $set: { "command_prefix": argslist[0] } });
  aiuser = await getAIUserById(aiuser.aiId);
  return await loadTemplate("prefix.txt",{prefix: aiuser.command_prefix});
}


/**
 * 
 * @param   {AIUser}  aiuser
 * @param   {Message} message
 * @param   {string}  args
 * @param   {Array}   argslist
 * @returns {string}
 */
async function command_command_prefix(aiuser,message,args,argslist)
{
  logTo("// [command_command_prefix]");
  if ( argslist[0] != "" ) return command_command_prefix_set(aiuser,message,args,argslist);
  return await loadTemplate("prefix.txt",{prefix: aiuser.command_prefix});
}


/**
 * 
 * @param {AIUser}  aiuser 
 * @param {Message} message 
 * @param {string}  args 
 * @param {Array}   argslist 
 * @returns 
 */
// command_image_v1 downloads the image to file, then references the file in the response.
// command_image_v2 downloads the image to Buffer, then builds an attachment containing the buffer in the response.
// v1 is not slower or faster than v2
// v1 is incredibly memory fit, seeing memory go from 30 MB up to 50 MB when processing 4x4MB images at the same time.
// v2 is incredibly memory intensive, seeing memory go from 30 MB up to 500 MB when processing 4x4MB images at the same time.
async function command_image_v1(aiuser,message,args,argslist)
{
  logTo("// [command_image_v1] Begin");

//const options = copyObject(template_openai_image_request);
  const options = new OpenAIImageRequest(aiuser.image_request);

  if (!args && aiuser.last_image_prompt) args = aiuser.last_image_prompt;

  if (!args) args = "Draw an image of Rick Astley running away from his girlfriend who is crying.";

  options.prompt = args; // Set the prompt for the OpenAI request

  try
  {
    // create a new date in INT format
    const now = Date.now();
    const gptResponseImg = await image_openai.images.generate(options);
    const data           = gptResponseImg.data[0]
    const url            = data.url
    const filename       = dirs.images + "/" + now + "-" + args.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9_-]/g,"").substring(0,80) + "-" + aiuser.aiId + ".png";
    logTo("// [command_image_v1] gptResponseImg.data")
    logTo(data);
    await downloadToFile(url,filename);
    const usage = {}
    usage[options.size] =  1;
    await updateAIImageHistory(aiuser,args,filename,data.revised_prompt);
    await updateAIUserUsage(aiuser,"image",options.model,usage); // Add usage to DB.
    return { content: "**original_prompt:** " + aiuser.command_prefix + "image " + args + "\n" + "**revised_prompt:** " + data.revised_prompt, files: [ filename ], }
  }
  catch (err)
  {
    logTo('[command_image_v1] - Error creating image:');
    logTo(err);
    return await loadTemplate("image-error-1.txt");
  };
}

/* Uses buffer rather than file. Not recommended for large images, so not recommended at all.
async function command_image_v2(mcontext,mprofile,args,argslist,prefix,message,muser)
{
  logTo("[command_image_v2] Begin");

  const options = copyObject(template_openai_image_request);

  if (args == "" && mcontext.last_image != null) args = mcontext.last_image;

  if (args == "") args = "Draw an image of Rick Astley giving up.";

  options.prompt = args; // Set the prompt for the OpenAI request

  try
  {
    const gptResponseImg = await openai.createImage(options)
    const data           = gptResponseImg.data.data[0]
    const url            = data.url
    const name           = args.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9_-]/g,"").substring(0,80) + "-" + message.createdTimestamp + "-" + message.id + ".png";
    logTo("[command_image_v2] gptResponseImg.data")
    logTo(gptResponseImg.data);
    const buffer = await downloadToBuffer(url);
    const attachment = new AttachmentBuilder(buffer,{name: name, description: name, }); // can reference attachments like:  .setThumbnail("attachment://favicon.png")
    const usage = {}
    usage[options.size] =  1;
    addMindUsage("image",muser,usage);
    mcontext.last_image = args;
    return { content: mcontext.prefix + "image " + args, files: [ attachment ], };
  }
  catch (err)
  {
    logTo('[command_image_v2] Error creating image:');
    logTo(err);
    return await loadTemplate("image-error-1.txt");
  };
}
*/

async function imageFormatForOpenai_v1(f_in,f_out = "") // v1
{
  // v1 
  // Cuts a perfect square out of the center of the picture.
  logTo("// [imageFormatForOpenai] Begin")
  if (!f_out) f_out = f_in;
  if (f_out.toLowerCase().substring(f_out.length-4,f_out.length) != ".png") f_out = f_out + ".png"
  logTo("// [imageFormatForOpenai] f_out: " + f_out);
  const image = await Jimp.read(f_in);
  const max   = Math.min(image.bitmap.width,image.bitmap.height);
  logTo(image.bitmap,true,false);
  if (image.bitmap.width != image.bitmap.height)
  {
    logTo("// [imageFormatForOpenai] Cropping image")
    const x_offset = parseInt( ( image.bitmap.width  - max ) / 2 );
    const y_offset = parseInt( ( image.bitmap.height - max ) / 2 );
    image.crop(x_offset,y_offset,max,max);
  }
  if (image.bitmap.width > 1024 || image.bitmap.height > 1024) image.resize(1024,1024);
  image.write(f_out);
  return f_out;
}

async function imageFormatForOpenai_v2(f_in,f_out = "") // v2
{
  // v2
  // Resizes the image to the largest between width and height
  logTo("// [imageFormatForOpenai] Begin")
  if (!f_out) f_out = f_in;
  if (f_out.toLowerCase().substring(f_out.length-4,f_out.length) != ".png") f_out = f_out + ".png"
  logTo("// [imageFormatForOpenai] f_out: " + f_out);
  const image = await Jimp.read(f_in);
  const max   = Math.max(image.bitmap.width,image.bitmap.height);
  console.log(image.bitmap,true,false);
  if (image.bitmap.width != image.bitmap.height || image.bitmap.width > 512 || image.bitmap.height > 512)
  {
    logTo("// [imageFormatForOpenai] Resizing image")
    image.resize(512,512);
  }
  logTo("// [imageFormatForOpenai] Writing image: " + f_out);
  await image.writeAsync(f_out);
}


async function imageFormatForOpenai(f_in,f_out = "") // v3
{
  // v3
  // Resizes the image to the largest between width and height, but keeps scale.
  logTo("// [imageFormatForOpenai] Begin")
  if (!f_out) f_out = f_in;
  if (f_out.toLowerCase().substring(f_out.length-4,f_out.length) != ".png") f_out = f_out + ".png"
  logTo("// [imageFormatForOpenai] f_out: " + f_out);
  const image = await Jimp.read(f_in);
  console.log(image.bitmap,true,false);
  if (image.bitmap.width > 1536 || image.bitmap.height > 1536)
  {
    logTo("// [imageFormatForOpenai] Resizing image")
    if      (image.bitmap.width > image.bitmap.height) image.resize(1536,Jimp.AUTO)
    else    image.resize(Jimp.AUTO,1536);
    logTo("// [imageFormatForOpenai] Resized image to " + image.bitmap.width + "x" + image.bitmap.height);
  }
  logTo("// [imageFormatForOpenai] Writing image: " + f_out);
  await image.writeAsync(f_out);
}


async function imageFormatThumbnail(f_in,f_out = "") // v1
{

}


/**
 * @param {AIUser}  aiuser 
 * @param {Message} message 
 * @param {string}  args 
 * @param {Array}   argslist 
 * @returns 
 */
async function command_image_variation_v1(aiuser,message,args,argslist)
{
  logTo("// [command_image_variation_v1] command_image_variation_v1 Begin");

//const options   = copyObject(template_openai_image_variation_request);
  const options   = copyObject(aiuser.image_variation);

  let   url_input = argslist[argslist.length-1]

  if (!url_input && aiuser.last_image_file)
  {
    logTo("// [command_image_variation_v1] Using aiuser.last_image_file: " + aiuser.last_image_file);
    url_input = aiuser.last_image_file;
  }

  if (!url_input) return await loadTemplate("image-variation-error-1.txt");

  try
  {
    const now            = Date.now();
    const file_input     = dirs.images + "/" + now + "-" + aiuser.aiId + "-" + "image_variation_input"  + ".png";
    const file_output    = dirs.images + "/" + now + "-" + aiuser.aiId + "-" + "image_variation_output" + ".png";
    await imageFormatForOpenai(url_input,file_input); // Resize and reformat input image
    const gptResponseImg = await image_openai.images.createVariation({image: fs.createReadStream(file_input)},options.count,options.size);
    const data           = gptResponseImg.data[0];
    const url_output     = data.url;
    logTo("// [command_image_variation_v1] gptResponseImg.data",true,false);
    logTo(data,true,false);
    await downloadToFile(url_output,file_output);
    const usage = {}
    usage[options.size]  =  1;
    await updateAIImageHistory(aiuser,null,file_output);
    await updateAIUserUsage(aiuser,"image-variation",options.model,usage); // Add usage to DB.
    return { content: "", files: [ file_output ], }
  }
  catch (err)
  {
    logTo('// command_image_variation_v1 - Error creating image variation:');
    logTo(err);
    return await loadTemplate("image-error-1.txt");
  };
}


async function command_commands(aiuser,message,args,argslist)
{
  //const response = await loadTemplate("commands.txt",{p: aiuser.command_prefix});
  const response = await loadTemplate("help.txt",{p: aiuser.command_prefix});
  return response;
}


async function command_help(aiuser,message,args,argslist)
{
  const response = await loadTemplate("help.txt",{p: aiuser.command_prefix});
  return response;
}


async function command_test(aiuser,message,args,argslist)
{
  const exampleEmbed = new EmbedBuilder()
    .setColor(0x009FFF)
    .setTitle('setTitle 256 bytes max')
    .setURL('https://discord.js.org/')
    .setAuthor({ name: 'setAuthor 256 characters max', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
    .setDescription('setDescription 4096 characters max')
    .setThumbnail('https://i.imgur.com/AfFp7pu.png')
    .addFields(
      { name: 'name 256 characters max', value: 'value 1024 characters max' },
      { name: '\u200B', value: '\u200B' }, // space
      { name: 'name 256 characters max', value: 'value 1024 characters max', inline: true },
      { name: 'name 256 characters max', value: 'value 1024 characters max', inline: true },
    )
    .addFields({ name: 'name 256 characters max', value: 'value 1024 characters max', inline: true })
    .setImage('https://i.imgur.com/AfFp7pu.png')
    .setTimestamp()
    .setFooter({ text: 'setFooter 2048 characters max', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

    const attachment = new AttachmentBuilder(Buffer.from("Hello, world!"),{name: "hello.txt", description: "hello.txt", });

    console.log("// [command_test] AttachmentBuilder Test")
    console.log(attachment);

  return { content: "2048 characters max", embeds: [exampleEmbed], files: [ attachment ] };
}


async function command_get_message(aiuser,message,args,argslist)
{
  const omessage  = await discord_get_message(message.channelId, argslist[0] || "0");
  console.log(omessage);
  const response  = "Check Console"
  return response;
}


async function DoChatCompletion(aiuser,chat_profile)
{
  logTo("// [DoChatCompletion] Begin");
  if (!chat_profile) chat_profile = await getAIChatProfile(aiuser);
  const chat_request      = new OpenAIChatRequest(aiuser.chat_settings);
  const msgobj            = await buildAIChatMessages(aiuser,chat_profile);
  chat_request.messages   = msgobj.messages;
  chat_request.max_tokens = DEFAULT_MAX_NEW_TOKENS || 1536;
  chat_request.model      = DEFAULT_CHAT_MODEL || "mixtral-8x7b-32768"; //  "llama2-70b-4096"   "gpt-3.5-turbo"
  logTo("// [DoChatCompletion] chat_request:");
  logTo(chat_request);

  let chat_response

  try
  {
    logTo("// [DoChatCompletion] openai.chat.completions.create:");
    chat_response = await openai.chat.completions.create(chat_request);
    logTo("// [DoChatCompletion] chat_response:");
    logTo(chat_response);
  }
  catch (err)
  {
    logTo("// [DoChatCompletion] Error attempting openai.chat.completions.create()");
    logTo(err);
    return;
  }

  // Add usage to DB
  if (chat_response && chat_response.usage)
  {

    logTo("// [DoChatCompletion] chat_response.usage");
    logTo(chat_response.usage);
    await updateAIUserUsage(aiuser,"text",chat_request.model,chat_response.usage);
  }

  return chat_response;
}


async function command_activate(aiuser,message,args,argslist)
{
  const result = await toggleAIChatChannelActive(aiuser,message.channelId)
  logTo("// [command_activate] toggleAIChatChannelActive() result: " + result);
  if (result == true) return await loadTemplate("activate-true.txt", {p: aiuser.command_prefix});
  else                return await loadTemplate("activate-false.txt",{p: aiuser.command_prefix});
}


async function command_chat_import(aiuser,message,args,argslist)
{
  try
  {
    if (!argslist || argslist.length == 0) return await loadTemplate("command-chat-import-help.txt",{p: aiuser.command_prefix});
    const chat_profile = await getAIChatProfile(aiuser);
    argslist.filter( arg => arg.match(/^https:\/\/[^ ]*$/gi) && true );
    if (!argslist[0]) return await loadTemplate("command-chat-import-help.txt",{p: aiuser.command_prefix});
    const url_input = argslist[0]
    const now = Date.now();
    let jsonFile = dirs.images + "/" + now + "-" + aiuser.aiId + "-" + "character_card" + ".png";
    await downloadToFile(url_input,jsonFile);
    const jsonText = fs.readFileSync(jsonFile,"utf8")
    //const new_messages = JSON.parse(jsonText);
    let new_messages
    try
    {
      new_messages = JSON.parse(jsonText);
    }
    catch (err)
    {
      logTo(err);
      return await loadTemplate("command-chat-import-error-2.txt",{p: aiuser.command_prefix});
    }
    if (new_messages.length == 0) return await loadTemplate("command-chat-import-help.txt",{p: aiuser.command_prefix});
    while (new_messages.length > chat_profile.messageIds.length)
    {
      chat_profile.messageIds.push([])
    }
    while (new_messages.length < chat_profile.messageIds.length)
    {
      chat_profile.messageIds.pop()
    }
    for (let key in new_messages)
    {
      new_messages[key] = new OpenAIMessage(new_messages[key]);
    }
    chat_profile.messages = new_messages;
    await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: {"messages": chat_profile.messages, "messageIds": chat_profile.messageIds}} );
    return await loadTemplate("command-chat-import-success-1.txt",{p: aiuser.command_prefix, profileId: chat_profile.chatName, count: new_messages.length});
  }
  catch (err)
  {
    logTo(err);
    return await loadTemplate("command-chat-import-error-1.txt",{p: aiuser.command_prefix});
  }
}


async function command_new_thread(aiuser,message,args,argslist)
{
  try
  {
    logTo("// [command_new_thread] Begin")
    const chat_profile = await getAIChatProfile(aiuser);
    const threadName   = aiuser.discordUser.globalName + "-" + Date.now()
    const thread       = await discord_create_thread(message.channelId,threadName,ChannelType.PrivateThread,aiuser.discordUser.globalName);
    console.log(thread);
    await thread.members.add(aiuser.discordUser.id);
    const welcomeMessage = await loadTemplate("command-new-thread-welcome-1.txt",{p: aiuser.command_prefix, user: aiuser.discordUser.globalName});
    await thread.send(welcomeMessage);
    await toggleAIChatChannelActive(aiuser,thread.id,true);
    return true
  }
  catch (err)
  {
    logTo(err);
    return await loadTemplate("command-new-thread-error-1.txt",{p: aiuser.command_prefix});
  }
}


async function command_chat_export(aiuser,message,args,argslist)
{
  const chat_profile = await getAIChatProfile(aiuser);
  if (!chat_profile || !chat_profile.messages || chat_profile.messages.length == 0) return await loadTemplate("command-chat-export-error-1.txt",{p: aiuser.command_prefix});
  const text = JSON.stringify(chat_profile.messages,null,2);
  const name = "chat-" + Date.now() + ".json";
  const description = `Tavern4Discord Chat Message Export`;
  const attachment = new AttachmentBuilder(Buffer.from(text),{name: name, description: description, });
  const result = { content: `Exported ${chat_profile.messages.length} Chat Messages`, files: [ attachment ] };
  return result;
}


async function command_import_card(aiuser,message,args,argslist)
{
  logTo("// [command_import_card] Begin");

  if (argslist.length == 0) return await loadTemplate("command_import_card-error-1.txt",{p: aiuser.command_prefix, url: "default" });

  let content = "";
  let result

  for (let url_input of argslist)
  {
    if (url_input == "default") url_input = DEFAULT_CHARACTER_CARD_URL;

    if (!url_input) return await loadTemplate("command_import_card-error-1.txt",{p: aiuser.command_prefix, url: "default" });

    try
    {
      const now = Date.now();
      let cardFile = dirs.images + "/" + now + "-" + aiuser.aiId + "-" + "character_card" + ".png";
      await downloadToFile(url_input,cardFile);
      let card = cCards.parse(cardFile)
      if (!card) return await loadTemplate("command_import_card-error-2.txt",{p: aiuser.command_prefix, url: "default"});
      card = new TavernCardV2(card);
      if (!card.data.extensions.discord) card.data.extensions.discord = {}
      card.data.extensions.discord.image_url = url_input;
      logTo("// [command_import_card] card");
      logTo(card);
      const aicard = await importAICharacterCard_v2(aiuser,card,url_input);
      aiuser = await getAIUserById(aiuser.aiId);
      result = await discord_character_card_embed(aiuser,aicard);
      content = content + "> **Imported** Character Card: **" + aicard.cardName + "**\n";
      result.content = content
    }
    catch (err)
    {
      logTo('// [command_import_card] Error importing character card:' + args);
      logTo(err);
      return await loadTemplate("command_import_card-error-1.txt",{p: aiuser.command_prefix, url: "default"});
    };
  }
  return result;
}


async function command_character_list(aiuser,message,args,argslist)
{
  const chat_profile = await getAIChatProfile(aiuser);
  let cards = await getAICards(aiuser.aiId);
  if (args.length > 0)  cards = cards.filter( card => { let r = true; for (const arg of argslist) { if (!card.cardName.toLowerCase().includes(arg.toLowerCase())) r = false; }; return r; } );
  let id = 0;
  let description = `# ${aiuser.discordUser.globalName}'s Character Cards\n`;
  const addFields = [];
  for (const card of cards)
  {
    id += 1;
    let line = `- ${id}. ${card.cardName}`
    if (card.cardId == chat_profile.cardId_user) line = line + " **[My Card]**"
    if (card.cardId == chat_profile.cardId_bot)  line = line + " **[Bot Card]**"
    description = description + line + `\n`;
  }
  if (id == 0 && args.length == 0) return await loadTemplate("no-cards-message.txt",  { p: aiuser.command_prefix, user: aiuser.discordUser.globalName});
  if (id == 0 && args.length  > 0) return await loadTemplate("command_character-list-not-found.txt",{ p: aiuser.command_prefix, user: aiuser.discordUser.globalName});
  // const buttons   = [{customId: "character-list_0",label: "<----",style: ButtonStyle.Secondary}];
  const setColor  = 0x009FFF
  const setFooter = await loadTemplate("command_character-list-footer.txt",{ p: aiuser.command_prefix, user: aiuser.discordUser.globalName});
  const result    = discord_create_embed(false,setColor,null,null,null,null,null,null,description,null,addFields,null,null,setFooter,null,null);
  return result;
}


async function command_card(aiuser,message,args,argslist)
{
  try
  {
    logTo("// [command_card] Begin");
    const chat_profile = await getAIChatProfile(aiuser,message.channelId);
    const card_bot = await getAICardById(chat_profile.cardId_bot);
    if (card_bot) return await discord_character_card_embed(aiuser,card_bot);
  }
  catch (err) { logTo(err); };
}


async function command_my_card(aiuser,message,args,argslist)
{
  try
  {
    logTo("// [command_my_card] Begin");
    const chat_profile = await getAIChatProfile(aiuser,message.channelId);
    if (!chat_profile.cardId_user) return await loadTemplate("command-my-card-error-1.txt",{p: aiuser.command_prefix});
    const card_user = await getAICardById(chat_profile.cardId_user);
    if (!card_user) return await loadTemplate("command-my-card-error-2.txt",{p: aiuser.command_prefix});
    if (card_user) return await discord_character_card_embed(aiuser,card_user);
  }
  catch (err) { logTo(err); };
}


/**
 * Swaps between character cards.
 * 
 * @param {AIUser}  aiuser 
 * @param {Message} message
 * @param {string}  args
 * @param {Array}   argslist
 * @returns
 */
async function command_character_swap(aiuser,message,args,argslist)
{
  const chat_profile = await getAIChatProfile(aiuser,message.channelId);
  if (args.length == 0) return await loadTemplate("command_character_swap-help.txt",  { p: aiuser.command_prefix, user: aiuser.discordUser.globalName});
  const cards = await getAICards(aiuser.aiId);
  //if (args.length > 0)  chat_profiles = chat_profiles.filter( chat_profile => { let r = true; for (const arg of argslist) { if (!chat_profile.profileId.toLowerCase().includes(arg.toLowerCase())) r = false; }; return r; } );
  let card
  //const card = cards.find( card => card.data.name.toLowerCase().startsWith(args.toLowerCase()) );
  if (!isNaN(parseInt(args))) card = cards[parseInt(args)-1];
  if (!card) card = cards.find( card => card.cardName.toLowerCase().includes(args.toLowerCase()) );
  if (!card) return await loadTemplate("command_character_swap-not-found.txt",  { name: args, p: aiuser.command_prefix, user: aiuser.discordUser.globalName});
  chat_profile.cardId_bot = card.cardId;
  await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: { cardId_bot: chat_profile.cardId_bot } } );
  await updateObjectInMongoDB( MONGO_URI, "users",         {"aiId":   aiuser.aiId},         {$set: {"last_cardId_bot": chat_profile.cardId_bot}} );
  return loadTemplate("command_character_swap-success.txt",  { cardName: card.cardName, message_count: chat_profile.messages.length });
}


/**
 * Regenerates the last chat response.
 * 
 * @param {AIUser}  aiuser 
 * @param {Message} message
 * @param {string}  args
 * @param {Array}   argslist
 * @returns
 */
async function command_regenerate(aiuser,message,args,argslist)
{
  const chat_profile = await getAIChatProfile(aiuser);

  if (chat_profile.memory_enabled == false)
    return loadTemplate("command_regen-error-1.txt",{p: aiuser.command_prefix});
  if (chat_profile.messages.length == 0)
    return loadTemplate("command_regen-error-2.txt",{p: aiuser.command_prefix});

  // pop the previous message from the chat history
  //await popAIChatMessages(aiuser,1);
  const old_message    = chat_profile.messages.pop();
  const old_messageIds = chat_profile.messageIds.pop();

  // If args are provided, append it temporarily to the last message. This works better than sending a separate system message.
  if (args)
  {
    chat_profile.messages[chat_profile.messages.length-1].content = chat_profile.messages[chat_profile.messages.length-1].content + "\n\n" + args;
  }

  // Get chat completion response
  const chat_response = await DoChatCompletion(aiuser,chat_profile);

  if (!chat_response || !chat_response.choices || !chat_response.choices[0]) return loadTemplate("command_regen-error-3.txt",{p: aiuser.command_prefix});

  let new_message = chat_response.choices[0].message

  new_message.name = old_message.name;

  if (new_message.content.length > CHAT_RESPONSE_MAX_BYTES)
  {
    console.log(`// [handle_ChatMessage] new_message.content.length (${new_message.content.length}) > CHAT_RESPONSE_MAX_BYTES (${CHAT_RESPONSE_MAX_BYTES})`);
    new_message.content = splitResponse(new_message.content,CHAT_RESPONSE_MAX_BYTES)[0];
  }

  new_message = new OpenAIMessage(new_message);

  await popAIChatMessages(aiuser,1);

  await pushAIChatMessages( aiuser, [new_message], [old_messageIds] );

  // Edit the last message in the chat
  if (old_messageIds && old_messageIds[0])
  {
    await discord_edit_message( message.channelId, old_messageIds[0], {content: new_message.content.substring(0,2000)} );
  }

  return true;
}


/**
 * Trims the last chat response to # of lines.
 * 
 * @param {AIUser}  aiuser 
 * @param {Message} message
 * @param {string}  args
 * @param {Array}   argslist
 * @returns
 */
async function command_trim(aiuser,message,args,argslist)
{
  const chat_profile = await getAIChatProfile(aiuser);

  if (chat_profile.memory_enabled == false)
    return loadTemplate("command_trim-error-1.txt",{p: aiuser.command_prefix});
  if (chat_profile.messages.length == 0)
    return loadTemplate("command_trim-error-2.txt",{p: aiuser.command_prefix});

  const trim_count = parseInt(args);

  if (!trim_count || trim_count < 1)
    return loadTemplate("command_trim-help.txt",{p: aiuser.command_prefix});

  const chat_message = chat_profile.messages[chat_profile.messages.length-1];
  let   new_content  = ""
  let   i            = 0

  for (let line of chat_message.content.split("\n"))
  {
    if (i < trim_count)
    {
      new_content = new_content + line + "\n";
      if (line != "") i += 1;
    }
  }

  chat_message.content = new_content;

  await popAIChatMessages(aiuser,1);
  await pushAIChatMessages(aiuser,[chat_message],[chat_profile.messageIds[chat_profile.messageIds.length-1]]);

  if (message.guildId && chat_profile.messageIds[chat_profile.messageIds.length-1] && chat_profile.messageIds[chat_profile.messageIds.length-1][0])
  {
    await discord_edit_message( message.channelId, chat_profile.messageIds[chat_profile.messageIds.length-1][0], {content: new_content.substring(0,2000)} );
  }

  return true;
}


function discord_new_action_row(comp1,comp2,comp3,comp4,comp5)
{
  const components = []
  if (comp1) components.push(comp1);
  if (comp2) components.push(comp2);
  if (comp3) components.push(comp3);
  if (comp4) components.push(comp4);
  if (comp5) components.push(comp5);
  return new ActionRowBuilder().addComponents(...components)
}

function discord_new_button(label,customId,style,url,disabled)
{
  const button = new ButtonBuilder()
  if (label)    button.setLabel(label);
  if (customId) button.setCustomId(customId);
  if (style)    button.setStyle(style);
  if (url)      button.setURL(url);
  if (typeof disabled == "boolean") button.setDisabled(disabled);
  return button;
}

async function discord_create_memory_embed(aiuser,chat_profile,pageNumber)
{
  try
  {
    const addFields     = [];
    const components    = [];
    const m             = chat_profile.messages
    const maxPage       = Math.max(1,m.length-2);
    const card_bot      = await getAICardById(chat_profile.cardId_bot);
    const card_user     = await getAICardById(chat_profile.cardId_user);
    let   footer        = "";
    const chat_profiles = await getAIChatProfiles(aiuser.aiId,chat_profile.channelId);

    if (chat_profile.memory_enabled && chat_profile.messages.length > 0)
    { 
      pageNumber = parseInt(pageNumber);
      if (isNaN(pageNumber))    pageNumber = 0;
      if (pageNumber < 1)       pageNumber = maxPage
      if (pageNumber > maxPage) pageNumber = 1;
      footer = `Page ${pageNumber} of ${maxPage}`;
      let startIndex = pageNumber-1;
      let endIndex   = pageNumber+1;

      if (DEBUG_MODE) console.log(`// [discord_create_memory_embed] pageNumber: ${pageNumber}, maxPage: ${maxPage}, startIndex: ${startIndex}, endIndex: ${endIndex}`)

      for (let i = startIndex; i <= endIndex; i++)
      {
        if (m[i])
        {
          const name = "= " + (i+1) + " =  " + ( m[i].name || "Unnamed" ) +  "  (" + m[i].role + ")"
          const content = discord_shorten_content(m[i].content,768)
          if (name && content) addFields.push({ name: name, value: content, inline: false });
        }
      }

      // Page Buttons
      const prev_page  = discord_new_button('< Page','memory-page_' + aiuser.aiId + "_" + chat_profile.chatId + "_" + (pageNumber-1),ButtonStyle.Secondary);
      const next_page  = discord_new_button('Page >','memory-page_' + aiuser.aiId + "_" + chat_profile.chatId + "_" + (pageNumber+1),ButtonStyle.Secondary);
      components.push(discord_new_action_row(prev_page,next_page));
    }

    const dropdown = new StringSelectMenuBuilder()
      .setCustomId(`chat-profile-select_${aiuser.aiId}`)
      .setPlaceholder('Select a Chat Profile');

    logTo(`// [discord_create_memory_embed] chat_profiles.length: ${chat_profiles.length}`)

    if (chat_profiles)
    {
      for (const p of chat_profiles)
      {
        const o = new StringSelectMenuOptionBuilder()
          .setLabel(p.chatName)
          .setDescription(`${p.messages.length} messages`)
          .setValue(p.chatId)
        if (p.chatId == chat_profile.chatId) o.setDefault(true);
        dropdown.addOptions(o)
      }
    }

    dropdown.addOptions(new StringSelectMenuOptionBuilder().setLabel("New Chat Profile").setDescription("Creates a new Chat Profile").setValue("new-chat-profile"));

    components.push(discord_new_action_row(dropdown));

    let text = await loadTemplate("command_memory.txt",{p: aiuser.command_prefix, memory_enabled: chat_profile.memory_enabled, messages_length: chat_profile.messages.length, pageNumber: pageNumber+1, maxPage: maxPage+1});
    if (components.length > 0) text = text + "\n" + await loadTemplate("command_memory-history.txt",{p: aiuser.command_prefix, pageNumber: pageNumber, maxPage: maxPage});
    const response = discord_create_embed(false,0x009FFF,null,null,null,null,null,null,text,card_bot.image_url,addFields,null,null,footer,null,components.reverse())
    return response;
  }
  catch (err)
  {
    logTo('// [discord_create_memory_embed] Error creating memory embed:')
    logTo(err);
  }
}


/**
 * @param {AIUser}        aiuser 
 * @param {Message}       message
 * @param {string}        args
 * @param {Array<string>} argslist
 * @returns
 */
async function command_memory(aiuser,message,args,argslist)
{
  const chat_profile = await getAIChatProfile(aiuser);
  const tvars = combineMaps(chat_profile,aiuser);
  tvars.p = aiuser.command_prefix;
  tvars.messages_length = chat_profile.messages.length
  tvars.memory_enabled_opposite = !chat_profile.memory_enabled

  if (!args)  return await discord_create_memory_embed(aiuser,chat_profile,-1);

  // Toggle
  let toggle
  if (argslist[0] == "true"  || argslist[0] == "t")    toggle = true;
  if (argslist[0] == "on"    || argslist[0] == "on")   toggle = true;
  if (argslist[0] == "false" || argslist[0] == "f")    toggle = false;
  if (argslist[0] == "off"   || argslist[0] == "off")  toggle = false;
  if ( toggle != null )
  {
    await toggleAIChatMemoryActive(aiuser,toggle);
    return await command_memory(aiuser,message,"",[])
  }
  if (argslist[0] == "clear" || argslist[0] == "c")
  {
    if (argslist[1] != "confirm" && argslist[1] != "c")
    {
      return await loadTemplate("command_memory-clear-1.txt",tvars);
    }
    else
    {
      await clearAIChatMessages(aiuser);
      return await loadTemplate("command_memory-clear-2.txt",tvars);
    }
  }

  // Page Number
  const pageNumber = parseInt(args);
  if (!isNaN(pageNumber))
  {
    return await discord_create_memory_embed(aiuser,chat_profile,pageNumber);
  }
}


/**
 * Deletes the last # of messages.
 * 
 * @param {AIUser}        aiuser 
 * @param {Message}       message
 * @param {string}        args
 * @param {Array<string>} argslist
 * @returns
 */
async function command_delete(aiuser,message,args,argslist)
{
  const chat_profile = await getAIChatProfile(aiuser);
  const tvars = combineMaps(chat_profile,aiuser);
  tvars.p = aiuser.command_prefix;
  tvars.messages_length = chat_profile.messages.length
  let delCount = parseInt(argslist[0]) || 0;
  if (argslist[0] == "all" || argslist[0] == "a") delCount = chat_profile.messages.length;
  if (!args) return loadTemplate("command_delete-help.txt",tvars);
  if (delCount > chat_profile.messages.length) delCount = chat_profile.messages.length
  for (let i = 0; i < delCount; i++)
  {
    await popAIChatMessages(aiuser,1);
  }
  tvars.count = delCount;
  return loadTemplate("command_delete-success.txt",tvars);
}


/**
 * @param {AIUser}        aiuser
 * @param {Message}       message
 * @param {string}        args
 * @param {Array<string>} argslist
 * @returns
 */
async function command_temperature(aiuser,message,args,argslist)
{
  const tvars = {p: aiuser.command_prefix, temperature: aiuser.chat_settings.temperature, old_temperature: aiuser.chat_settings.temperature};
  if (!args) return loadTemplate("command_temperature-help.txt",tvars);
  let temperature = parseFloat(argslist[0]);
  if (isNaN(temperature)) return loadTemplate("command_temperature-help.txt",tvars);
  if (temperature < 0)    temperature = 0;
  if (temperature > 2.0)  temperature = 2.0;
  aiuser.chat_settings.temperature = temperature;
  await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, {$set: {"chat_settings.temperature": temperature}} );
  tvars.temperature = temperature;
  return loadTemplate("command_temperature-success.txt",tvars);
}


/**
 * @param {AIUser}        aiuser 
 * @param {Message}       message
 * @param {string}        args
 * @param {Array<string>} argslist
 * @returns
 */
async function command_deploy_slash_commands(aiuser,message,args,argslist)
{
  if (!message || !message.guildId) return "This command can only be used in a server.";
  const result = await discord_deploy_slash_commands(message.guildId);
  return result;
}


async function discord_deploy_slash_commands(guildId)
{
  try {
    const fs                       = require('node:fs');
    const { REST, Routes }         = require('discord.js');

    const commands = [];
    // Grab all the command files from the commands directory you created earlier
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      commands.push(command.data.toJSON());
    };

    // Construct and prepare an instance of the REST module
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

    console.log(`For Server: ${guildId} - Started refreshing ${commands.length} application commands.`);
    const data = await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
    console.log(`For Server: ${guildId} - Successfully reloaded ${data.length} application commands.`);
    return `For Server: ${guildId}\nSuccessfully reloaded ${data.length} application commands.`
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.log(`For Server: ${guildId} - Failed when reloading ${data.length} application commands.`);
    console.error(error);
    return `For Server: ${guildId}\nFailed when reloading ${data.length} application commands.`;
  }
}


/**
 * @param {AIUser}  aiuser 
 * @param {Message} message 
 * @param {string}  content 
 * @returns 
 */
async function handleCommand(aiuser,message,content)
{
  logTo("// [handleCommand]");

  const commandFull = content.substring(aiuser.command_prefix.length).replace(/^\s+/,'').replace(/\s+$/,''); // Save the full command, minus the prefix, to commandFull
  const commandName = commandFull.replace(/\s.*/g,"").toLowerCase(); // Get the command name
  const args        = commandFull.substring(commandName.length+1); // Get the arguments of the command
  const argslist    = args.replace(/\s+/g," ").replace(/^\s+/g,"").split(" ");  // Split args into an array/list
  const out_args_v2 = [aiuser,message,args,argslist];

  let response      = ""

  const command_list =
  [
    { name: "activate",              altname: "",         delete_ephemeral: false,  func: command_activate              },
    { name: "commands",              altname: "",         delete_ephemeral: false,  func: command_commands              },
    { name: "command-prefix",        altname: "cp",       delete_ephemeral: false,  func: command_command_prefix        },
    { name: "help",                  altname: "",         delete_ephemeral: false,  func: command_help                  },
    { name: "memory",                altname: "",         delete_ephemeral: false,  func: command_memory                },
    { name: "test",                  altname: "",         delete_ephemeral: false,  func: command_test                  },
    { name: "image",                 altname: "i",        delete_ephemeral: false,  func: command_image_v1              },
    { name: "image-variation",       altname: "iv",       delete_ephemeral: false,  func: command_image_variation_v1    },
    { name: "import",                altname: "",         delete_ephemeral: false,  func: command_import_card           },
    { name: "swap",                  altname: "switch",   delete_ephemeral: false,  func: command_character_swap        },
    { name: "select",                altname: "",         delete_ephemeral: false,  func: command_character_swap        },
    { name: "list",                  altname: "",         delete_ephemeral: false,  func: command_character_list        },
    { name: "regenerate",            altname: "",         delete_ephemeral: 2000,   func: command_regenerate            },
    { name: "temperature",           altname: "",         delete_ephemeral: false,  func: command_temperature           },
    { name: "trim",                  altname: "",         delete_ephemeral: 1,      func: command_trim                  },
    { name: "delete",                altname: "",         delete_ephemeral: 5000,   func: command_delete                },
    { name: "chat-export",           altname: "",         delete_ephemeral: false,  func: command_chat_export           },
    { name: "chat-import",           altname: "",         delete_ephemeral: false,  func: command_chat_import           },
    { name: "get-message",           altname: "gm",       delete_ephemeral: false,  func: command_get_message           },
    { name: "deploy-slash-commands", altname: "",         delete_ephemeral: false,  func: command_deploy_slash_commands },
    { name: "new-thread",            altname: "",         delete_ephemeral: false,  func: command_new_thread            },
    { name: "deactivate",            altname: "",         delete_ephemeral: 5000,   func: command_activate              },
    { name: "card",                  altname: "",         delete_ephemeral: false,  func: command_card                  },
    { name: "my-card",               altname: "",         delete_ephemeral: false,  func: command_my_card               },
  ]

  let command

  if (commandName == "activate" || commandName.substring(0,1) == "a")  { command = command_list[0], response = await command_activate (...out_args_v2); }

  else if ( !aiuser.active_channels.includes(message.channelId) ) { return; }

  else
  {
    for (const cmd of command_list)
    {
      if (cmd.name.substring(0,commandName.length) == commandName || cmd.altname == commandName)
      {
        logTo("// [handleCommand] " + cmd.name + " " + commandName);
        command  = cmd;
        response = await cmd.func(...out_args_v2);
        break;
      }
    }
  };

  if (!response) response = await loadTemplate("handleCommand-error.txt",{prefix: aiuser.command_prefix});

  logTo( { command: commandName, args: args, argslist: argslist, response: response },true,false );

  if (typeof response != "boolean") await respondMessage(message,response);

  // If message is a slash command, delete the reply after 5 seconds.
  if (message.type == 2 && (!command || command.delete_ephemeral))
  {
    await sleep((parseInt(command.delete_ephemeral) || 5000));
    await message.deleteReply();
  }

}


/**
 *  handle_Commands - Parses and executes one or more commands from a single input.
 * 
 * @param {AIUser}  aiuser 
 * @param {Message} message 
 * @param {string}  content 
 * @returns 
 */
async function handle_Commands(aiuser,message,content)
{
  logTo("// [handle_Commands]");

  const commandFull = "\n" + content.replace(/^\s+/,'').replace(/\s+$/,'');

  for (let command of commandFull.split("\n" + aiuser.command_prefix))
  {
    if ( command )
    {
      command = aiuser.command_prefix + command;
      logTo("// [handle_Commands] " + command);
      await handleCommand(aiuser,message,command);
    }
  }
}


//////////////////////////
// handle_SlashCommand
////////////////////////
/**
 * 
 * @param {CommandInteraction} interaction 
 * @returns 
 */
async function handle_SlashCommand(interaction)
{
  logTo("// [handle_SlashCommand]");

  await interaction.deferReply({ephemeral: true});

  const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		logTo(`No command matching ${interaction.commandName} was found.`);
    await interaction.editReply({ content: `No command matching ${interaction.commandName} was found.`, ephemeral: true });
		return;
	}

  const aiuser = await getAIUser(interaction.user,interaction.guildId,interaction.channelId);
  
  //if ( interaction.channel.type == ChannelType.GuildText )
  //{
    if ( interaction.commandName != "activate" && !aiuser.active_channels.includes(interaction.channelId))
    {
      await interaction.editReply({ content: 'This channel is not active for chat. Try /activate', ephemeral: true });
      return;
    }
  //}

  let content = aiuser.command_prefix + interaction.commandName

  interaction.options.data.forEach(
    option =>
    {
      if (option.type == 11)
        content = content + " " + option.attachment.url;
      else
        content = content + " " + option.value;
    }
  );

  //await interaction.reply({ content: 'Sending command: ' + content, ephemeral: true });

	try
  {
		await handle_Commands(aiuser,interaction,content);
	}
  catch (error)
  {
		logTo(error);
		await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true });
	}

}


/**
 * Updates chat messages in the database with the new message content upon message update by user.
 * 
 * @param {Message} oldMessage 
 * @param {Message} message 
 */
async function handle_MessageUpdate(oldMessage,message)
{
  logTo("// [handle_MessageUpdate] Begin");
  const aiuser = await getAIUser(message.author,message.guildId,message.channelId);
  let chat_profile = await mongoFindOne( MONGO_URI, "chat_profiles",{aiId: aiuser.aiId, messageIds: [message.id]});
  if (!chat_profile) { logTo("// [handle_MessageUpdate] Unable to find message in DB. Returning."); return; }
  chat_profile = new AIChatProfile(chat_profile);
  logTo("// [handle_MessageUpdate] chat_profile");
  logTo(chat_profile);
  // Find index of message.id in ARRAY chat_profile.messageIds
  let index;
  for (let key in chat_profile.messageIds) { if (chat_profile.messageIds[key].includes(message.id)) index = key; }
  // If message.id is not found in chat_profile.messageIds, return.
  if (!index) { logTo("// [handle_MessageUpdate] Unable to find message.id in chat_profile.messageIds. Returning."); return; }
  // Send typing indicator
  await message.channel.sendTyping();
  // Update chat_profile.messages[index].content with message.content
  chat_profile.messages[index].content = message.content;
  await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: {"messages": chat_profile.messages, "messageIds": chat_profile.messageIds}} );
  if (message.guildId)
  {
    await message.react("✅");
    await sleep(2000);
    await message.reactions.cache.get("✅").remove();
  }
}


/**
 * 
 * @param {ButtonInteraction} interaction 
 */
async function handle_ButtonInteraction(interaction)
{
  try
  {
    logTo("// [handle_ButtonInteraction]");

    const args           = interaction.customId.split("_");

    if (args[0].match(/^card-properties/g))
    {
      const aiId         = args[1];
      const cardId       = args[2];
      const pageNumber   = parseInt(args[3]);
      const aiuser       = await getAIUserById(aiId);
      const card         = await getAICardById(cardId);
      const new_message  = await discord_character_card_embed(aiuser,card,null,pageNumber);
      await interaction.update(new_message);
      return;
    }

    if (args[0].match(/^set-as-user/g))
    {
      const cardId_user  = args[2];
      const aiuser       = await getAIUser(interaction.user,interaction.guildId,interaction.channelId);
      const chat_profile = await getAIChatProfile(aiuser,interaction.channelId);
      if (!chat_profile.cardId_user || chat_profile.cardId_user != cardId_user)
      { chat_profile.cardId_user = cardId_user }
      else
      { chat_profile.cardId_user = "DEFAULT-USER-CARD" }
      await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: {"cardId_user": chat_profile.cardId_user}} );
      await updateObjectInMongoDB( MONGO_URI, "users",         {"aiId":   aiuser.aiId},         {$set: {"last_cardId_user": chat_profile.cardId_user}} );
      const card         = await getAICardById(cardId_user);
      const new_message  = await discord_character_card_embed(aiuser,card);
      await interaction.update(new_message);
      return;
    }

    if (args[0].match(/^set-as-bot/g))
    {
      const cardId_bot   = args[2];
      const aiuser       = await getAIUser(interaction.user,interaction.guildId,interaction.channelId);
      const chat_profile = await getAIChatProfile(aiuser,interaction.channelId);
      chat_profile.cardId_bot = cardId_bot || chat_profile.cardId_bot;
      await updateObjectInMongoDB( MONGO_URI, "chat_profiles", {"chatId": chat_profile.chatId}, {$set: {"cardId_bot": chat_profile.cardId_bot}} );
      await updateObjectInMongoDB( MONGO_URI, "users",         {"aiId":   aiuser.aiId},         {$set: {"last_cardId_bot": chat_profile.cardId_bot}} );
      const card         = await getAICardById(cardId_bot);
      const new_message  = await discord_character_card_embed(aiuser,card);
      await interaction.update(new_message);
      return;
    }

    if (args[0].match(/^card-prev/g) || args[0].match(/^card-next/g))
    {
      const direction    = args[0].match(/^card-prev/g) && -1 || 1;
      const cardId_cur   = args[2];
      const aiId         = args[1]
      const aiuser       = await getAIUserById(aiId);
      const cards        = await getAICards(aiuser.aiId);
      let cardIndex;
      for (let k in cards)
      {
        if (cards[k].cardId == cardId_cur) cardIndex = parseInt(k);
      }
      if (cardIndex != null)
      {
        cardIndex = cardIndex + direction;
        if (cardIndex < 0) cardIndex = cards.length - 1;
        if (cardIndex >= cards.length) cardIndex = 0;
      }
      if (cardIndex == null) cardIndex = 0;
      const new_message  = await discord_character_card_embed(aiuser,cards[cardIndex]);
      await interaction.update(new_message);
      return;
    }

    if (args[0].match(/^memory-page/g))
    {
      const aiId         = args[1];
      const cardId       = args[2];
      const pageNumber   = parseInt(args[3]);
      const aiuser       = await getAIUserById(aiId);
      const chat_profile = await getAIChatProfile(aiuser,interaction.channelId);
      const new_message  = await discord_create_memory_embed(aiuser,chat_profile,pageNumber);
      await interaction.update(new_message);
      return;
    }

    if (args[0].match(/^chat-profile-select/g))
    {
      const aiuser = await getAIUser(interaction.user,interaction.guildId,interaction.channelId);
      let chat_profile;
      // If the user who created the entry is not the user clicking it, ignore it.
      if (aiuser.aiId != args[1]) return;
      let chatId = interaction.values[0];
      if (chatId == "new-chat-profile")
      {
        chat_profile = await getAIChatProfile(aiuser,interaction.channelId,"//NEW-CHAT-PROFILE//");
      }
      else
      {
        chat_profile = await getAIChatProfile(aiuser,interaction.channelId,chatId);
      }
      if (chat_profile)
      {
        await setAIChatProfile(aiuser,interaction.channelId,chat_profile.chatId);
        const new_message  = await discord_create_memory_embed(aiuser,chat_profile,-1);
        await interaction.update(new_message);
      }
      return;
    }

    if (args[0].match(/^start-new-chat/g))
    {
      const aiuser           = await getAIUser(interaction.user,interaction.guildId,interaction.channelId);
      const cardId_bot       = args[2]
      await updateObjectInMongoDB( MONGO_URI, "users", {"aiId": aiuser.aiId}, {$set: {"last_cardId_bot": cardId_bot}} );
      const chat_profile     = await getAIChatProfile(aiuser,interaction.channelId,"//NEW-CHAT-PROFILE//");
      const new_message      = await discord_create_memory_embed(aiuser,chat_profile,-1);
      await interaction.update(new_message);
      return;
    }

  }
  catch (err) { logTo("// [handle_ButtonInteraction] FAILED"); logTo(err); }
}


//////////////////////////
// handle_InteractionCreate
////////////////////////
/**
 * 
 * @param {Interaction} interaction 
 */
async function handle_InteractionCreate(interaction)
{
  try
  {
    logTo("// [handle_InteractionCreate]");

    if (DEBUG_MODE) console.log(interaction);

    if (interaction.options && interaction.options._hoistedOptions) console.log(interaction.options._hoistedOptions);

    if (interaction.isChatInputCommand && interaction.isChatInputCommand())
    {
      await handle_SlashCommand(interaction);
      return;
    }

    // ButtonInteraction
    if (interaction.type == 3)
    {
      await handle_ButtonInteraction(interaction);
    }

  }
  catch (err) { logTo(err); }
}


///////////////////////////////
// Create required directories
//////////////////////////////

for (const key in dirs) makeDirectory(dirs[key]);


//////////////////////////
// Discord client events
////////////////////////

/**
 * 
 * @param {Client} c 
 */
async function ClientReady_Async(c)
{
  //console.log(await downloadToBuffer("http://10.0.0.155/index-controllers-ids.txt"))
}

client.once(Events.ClientReady, c => {
  try
  {
    logTo("// [Events.ClientReady]");
    logTo(`[DiscordAPI] Logged in as ${c.user.tag}`);
    ClientReady_Async(c);
  }
  catch (err) { console.log(err); };
});

client.on(Events.MessageCreate, function (message) { routeDiscordMessage(message); })

client.on(Events.MessageUpdate, async function (oldMessage,message) {
  try
  {
    logTo("// [Events.MessageUpdate]");
    if (message.author && message.author.bot)  { logTo("message.author.bot is true.  Returning."); return;  };
    log_user(message.author);
    log_message(message);
    await handle_MessageUpdate(oldMessage,message);
  }
  catch (err) { console.log(err); };
});

client.on(Events.InteractionCreate, handle_InteractionCreate);

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try
  {
    console.log("// [MessageReactionAdd] reaction")
    console.log(reaction);

    // When a reaction is received, check if the structure is partial
    if (reaction.partial) {
      // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error);
        // Return as `reaction.message.author` may be undefined/null
        return;
      }
    }

    // Now the message has been cached and is fully available
    // The reaction is now also fully available and the properties will be reflected accurately:
    console.log(`${reaction.message.author}'s message "${reaction.message.id}" gained a reaction from "${user.globalName}".`);

    console.log(user)
  }
  catch (err) { console.log(err); };
});


/**
 * Loads the default AI Character Cards from:
 *   templates/DEFAULT_BOT_CARD_FILE.json
 *   and
 *   templates/DEFAULT_USER_CARD_FILE.json 
 */
async function setAICardDefaults()
{
  try
  {
    logTo("// [setAICardDefaults] Begin")
    logTo("// [setAICardDefaults] Loading DEFAULT_USER_CARD_FILE: " + DEFAULT_USER_CARD_FILE)
    DEFAULT_USER_CARD = new AICard( JSON.parse( await loadTemplate( DEFAULT_USER_CARD_FILE ) ) );
    DEFAULT_USER_CARD.aiId = "PUBLIC"
    DEFAULT_USER_CARD.cardId = "DEFAULT-USER-CARD"
    DEFAULT_USER_CARD.cardName = "Default User Card"
    //if (DEFAULT_USER_CARD.data.name == "Nobody") DEFAULT_USER_CARD.data.name = ""
    DEFAULT_USER_CARD.data.name = ""
    logTo("// [setAICardDefaults] Saving DEFAULT-USER-CARD to MongoDB")
    await saveObjectToMongoDB( MONGO_URI, "cards", { "cardId": "DEFAULT-USER-CARD" }, DEFAULT_USER_CARD );
    logTo("// [setAICardDefaults] Loading DEFAULT_BOT_CARD_FILE: " + DEFAULT_BOT_CARD_FILE)
    DEFAULT_BOT_CARD = new AICard( JSON.parse( await loadTemplate( DEFAULT_BOT_CARD_FILE ) ) );
    DEFAULT_BOT_CARD.aiId = "PUBLIC"
    DEFAULT_BOT_CARD.cardId = "DEFAULT-BOT-CARD"
    DEFAULT_BOT_CARD.cardName = DEFAULT_BOT_CARD.data.name
    if (DEFAULT_BOT_CARD.data.character_version) DEFAULT_BOT_CARD.cardName = DEFAULT_BOT_CARD.data.name + " - " + DEFAULT_BOT_CARD.data.character_version
    logTo("// [setAICardDefaults] Saving DEFAULT-BOT-CARD to MongoDB")
    await saveObjectToMongoDB( MONGO_URI, "cards", { "cardId": "DEFAULT-BOT-CARD" }, DEFAULT_BOT_CARD );
    logTo("// [setAICardDefaults] Done!")
  }
  catch (err) { logTo("// [setAICardDefaults] ERROR"); logTo(err); }
}

setAICardDefaults();


///////////////////////////
// Discord Slash Commands
/////////////////////////

discord_load_slash_commands();

//////////////////////
// Discord bot login
////////////////////

client.login(app_config.DISCORD_BOT_TOKEN || app_config.DISCORD_BOT_API_KEY || app_config.BOT_TOKEN);
