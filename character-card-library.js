const fs          = require('fs');
const fetch       = require('node-fetch').default;
const sanitize    = require('sanitize-filename');
const PNG_encode  = require('png-chunks-encode');
const PNG_extract = require('png-chunks-extract');
const PNG_text    = require('png-chunk-text');


function isJsonString(str) { try { JSON.parse(str); } catch (e) { return false; }; return true; }

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



//////////////
// Functions
////////////


/**
 * decode - Extracts and decodes the tEXt chunk from a PNG file.
 * 
 * @param   {string} cardUrl - The path to the input PNG file.
 * @returns {string} A string containing the decoded character card JSON.
 */
function decode(cardUrl) {
  try {
    const buffer     = fs.readFileSync(cardUrl);

    const chunks     = PNG_extract(buffer);

    const textChunks = 
      chunks.filter( function (chunk)        { return chunk.name === 'tEXt' || chunk.name === 'zTXt' || chunk.name === 'iTXt'; } )
            .map(    function (chunk)        { return PNG_text.decode(chunk.data); } )
            .filter( function (decodedChunk) { return decodedChunk.keyword === 'chara'; } );

    if (textChunks.length === 0) {
      console.error('PNG metadata does not contain any character data with the keyword \'chara\'.');
      throw new Error('No PNG metadata for keyword \'chara\'.');
    }

    return Buffer.from(textChunks[0].text, 'base64').toString('utf8');
  }
  catch (e) {
    console.error('Error decoding character card:', e);
    return null;
  }
}


/**
 * parse - Extracts and decodes the tEXt chunk from a PNG file then turns that into an object.
 * 
 * @param {string} cardUrl - The path to the input PNG file.
 * @returns {string} An object containing the parsed character card JSON.
 */
function parse (cardUrl)
{
  try {
    return JSON.parse(decode(cardUrl));
  }
  catch (e) {
    console.error('Error parsing character card:', e);
    return null;
  }
}


/**
 * encode - Extracts and decodes the tEXt chunk from a PNG file.
 * 
 * @param   {string} cardJson        - The path to the input JSON file or a string containing the JSON.
 * @param   {string} inputImageFile  - The input PNG filename.
 * @param   {string} outputImageFile - The output PNG filename.
 * @returns {boolean}                - true if the character card was successfully encoded, false otherwise.
 */
function encode (cardJson,inputImageFile,outputImageFile)
{
  try {
    let jsonText
    if (typeof cardJson === 'object') jsonText = JSON.stringify(cardJson,null,2).toString('base64');
    if (typeof cardJson === 'string' &&  isJsonString(cardJson)) jsonText = JSON.stringify(JSON.parse(cardJson),null,2).toString('base64')
    if (typeof cardJson === 'string' && !isJsonString(cardJson)) jsonText = fs.readFileSync(cardJson).toString('base64');
    const new_chunk   = PNG_text.encode('chara', jsonText);
    let   chunk_found = false;
    const chunks      = PNG_extract(fs.readFileSync(inputImageFile));
    chunks.filter( function (chunk) { return chunk.name === 'tEXt' && PNG_text.decode(chunk.data).keyword === 'chara' ;})
          .map(    function (chunk) { chunk_found = true; chunk.data = new_chunk.data; } );
    // If chunk not found, splice the new text chunk before the last chunk
    if (!chunk_found) chunks.splice(-1, 0, new_chunk);
    const buffer = PNG_encode(chunks);
    fs.writeFileSync(outputImageFile, buffer);
    return true;
  }
  catch (e) {
    console.error('Error encoding character card:', e);
    return false;
  }
};


/**
 * detokenize_object - Replaces tokens in OpenAI messages with values provided in replaceWith.
 * 
 * @param {*} replaceWith - An object like { "{{user}}": "zh0ul" , "{{char}}": "Awesom-O" }
 * @param {*} replaceIn   - An array of OpenAI messages objects like [ { name: '{{CHAR}}', role: 'system', content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}." } ]
 * @param {*} regex_flags - The regex flags to use. Default is "gi".
 */
function detokenize_object(replaceIn,replaceWith,regex_flags = "gi")
{
  if (typeof replaceIn === 'string')
  {
    for (const keyWith in replaceWith) {
      const re = new RegExp(keyWith, regex_flags);
      replaceIn = replaceIn.replace(re, replaceWith[keyWith]);
    }
    return replaceIn;
  }
  if (typeof replaceIn === 'object')
  {
    for (const field in replaceIn) {
      if (typeof replaceIn[field] === 'string') replaceIn[field] = detokenize_object(replaceIn[field],replaceWith,regex_flags);
      if (typeof replaceIn[field] === 'object') detokenize_object(replaceIn[field],replaceWith,regex_flags);
    }
  }
  return replaceIn;
}
/* detokenize_object Example Usage:

  const replaceWith = { "{{user}}": "zh0ul" , "{{char}}": "Hermione" }
  const replaceIn = [
      {
        name: '{{CHAR}}',
        role: 'system',
        content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.",
      },
      {
        name: '{{USER}}',
        role: 'system',
        content: '{{user}} is a 21 year old college student.',
      }
  ]
  const result = detokenize_object(replaceWith,replaceIn)
*/


/**
 * 
 * @param {string} inp - The input string or object to count the bytes of.
 * @param {number} perFieldIncrease - Increase the byte count for each field by this much. Default is 0.
 * @param {number} c - The current byte count. Default is 0.
 * @returns 
 */
function get_byte_count(inp,fields,perFieldIncrease = 0,c = 0)
{
  if (typeof inp === 'string') return c + inp.length + perFieldIncrease
  if (typeof inp === 'object') {
    for (const key in inp) {
      //c = get_byte_count(key,perFieldIncrease,c)
      //c = get_byte_count(inp[key],fields,perFieldIncrease,c)
      if (typeof inp[key] == "object" || !fields || fields.includes(key)) c = get_byte_count(inp[key],fields,perFieldIncrease,c)
    }
  }
  return c;
}


function mes_example_to_openai(mes_example)
{
  let cur_line = "";
  let cur_name = "";
  let cur_role = "";
  let lines = mes_example.split("\n");
  let messages = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/<START>/i))
    {
      if (cur_line) messages.push({ name: cur_name, role: cur_role, content: cur_line });
      cur_line = ""; cur_name = ""; cur_role = "";
      continue;
    }
    const speaker = lines[i].match(/^{{(user|char)}}/i);
    let text
    if (speaker)  text = lines[i].replace(/^{{(user|char)}}:[ ]*/i, "");
    if (!speaker) text = lines[i];
    if (!speaker && cur_name)
    {
      cur_line += "\n" + text;
      continue;
    }
    if (!speaker)
    {
      continue;
    }
    if (speaker && speaker[0] && speaker[0] != cur_name)
    {
      
      if (cur_line) messages.push({ name: cur_name, role: cur_role, content: cur_line });
      cur_name = speaker[0];
      cur_line = text;
      if (speaker[0].match(/user/i)) cur_role = "user";
      if (speaker[0].match(/char/i)) cur_role = "assistant";
      continue
    }
  }
  if (cur_line) messages.push({ name: cur_name, role: cur_role, content: cur_line });
  return messages;
}


async function downloadChubCharacter(id) {
  const result = await fetch('https://api.chub.ai/api/characters/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          'format': 'tavern',
          'fullPath': id,
      }),
  });

  if (!result.ok) {
      const text = await result.text();
      console.log('Chub returned error', result.statusText, text);
      throw new Error('Failed to download character');
  }

  const buffer = await result.buffer();
  const fileName = result.headers.get('content-disposition')?.split('filename=')[1] || `${sanitize(id)}.png`;
  const fileType = result.headers.get('content-type');

  return { buffer, fileName, fileType };
}


async function downloadChubLorebook(id) {
  const result = await fetch('https://api.chub.ai/api/lorebooks/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          'fullPath': id,
          'format': 'SILLYTAVERN',
      }),
  });

  if (!result.ok) {
      const text = await result.text();
      console.log('Chub returned error', result.statusText, text);
      throw new Error('Failed to download lorebook');
  }

  const name = id.split('/').pop();
  const buffer = await result.buffer();
  const fileName = `${sanitize(name)}.json`;
  const fileType = result.headers.get('content-type');

  return { buffer, fileName, fileType };
}


async function downloadPygmalionCharacter(id) {
  const result = await fetch(`https://server.pygmalion.chat/api/export/character/${id}/v2`);

  if (!result.ok) {
      const text = await result.text();
      console.log('Pygsite returned error', result.status, text);
      throw new Error('Failed to download character');
  }

  const jsonData = await result.json();
  const characterData = jsonData?.character;

  if (!characterData || typeof characterData !== 'object') {
      console.error('Pygsite returned invalid character data', jsonData);
      throw new Error('Failed to download character');
  }

  try {
      const avatarUrl = characterData?.data?.avatar;

      if (!avatarUrl) {
          console.error('Pygsite character does not have an avatar', characterData);
          throw new Error('Failed to download avatar');
      }

      const avatarResult = await fetch(avatarUrl);
      const avatarBuffer = await avatarResult.buffer();

      const cardBuffer = characterCardParser.write(avatarBuffer, JSON.stringify(characterData));

      return {
          buffer: cardBuffer,
          fileName: `${sanitize(id)}.png`,
          fileType: 'image/png',
      };
  } catch (e) {
      console.error('Failed to download avatar, using JSON instead', e);
      return {
          buffer: Buffer.from(JSON.stringify(jsonData)),
          fileName: `${sanitize(id)}.json`,
          fileType: 'application/json',
      };
  }
}



// Warning: Some characters might not exist in JannyAI.me
async function downloadJannyCharacter(uuid) {
  // This endpoint is being guarded behind Bot Fight Mode of Cloudflare
  // So hosted ST on Azure/AWS/GCP/Collab might get blocked by IP
  // Should work normally on self-host PC/Android
  const result = await fetch('https://api.janitorai.me/api/v1/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          'characterId': uuid,
      }),
  });

  if (result.ok) {
      const downloadResult = await result.json();
      if (downloadResult.status === 'ok') {
          const imageResult = await fetch(downloadResult.downloadUrl);
          const buffer = await imageResult.buffer();
          const fileName = `${sanitize(uuid)}.png`;
          const fileType = result.headers.get('content-type');

          return { buffer, fileName, fileType };
      }
  }

  console.log('Janny returned error', result.statusText, await result.text());
  throw new Error('Failed to download character');
}

//////////////
// Exports
////////////

const cCards = {
  TavernCardV2,
  encode,
  decode,
  parse,
  detokenize_object,
  get_byte_count,
  mes_example_to_openai,
  downloadChubCharacter,
  downloadChubLorebook,
  downloadPygmalionCharacter,
  downloadJannyCharacter
}

module.exports = {
  TavernCardV2: TavernCardV2,
  cCards: cCards
};


/*
type TavernCardV1 = {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
}

type TavernCardV2 = {
  spec: 'chara_card_v2'
  spec_version: '2.0' // May 8th addition
  data: {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string

    // New fields start here
    creator_notes: string
    system_prompt: string
    post_history_instructions: string
    alternate_greetings: Array<string>
    character_book?: CharacterBook

    // May 8th additions
    tags: Array<string>
    creator: string
    character_version: string
    extensions: Record<string, any> // see details for explanation
  }
}
*/
/**
 * ? as in `name?: string` means the `name` property may be absent from the JSON
 * (aka this property is optional)
 * OPTIONAL PROPERTIES ARE ALLOWED TO BE UNSUPPORTED BY EDITORS AND DISREGARDED BY
 * FRONTENDS, however they must never be destroyed if already in the data.
 *
 * the `extensions` properties may contain arbitrary key-value pairs, but you are encouraged
 * to namespace the keys to prevent conflicts, and you must never destroy
 * unknown key-value pairs from the data. `extensions` is mandatory and must
 * default to `{}`. `extensions` exists for the character book itself, and for
 * each entry.
 **/
/*
type CharacterBook = {
  name?: string
  description?: string
  scan_depth?: number // agnai: "Memory: Chat History Depth"
  token_budget?: number // agnai: "Memory: Context Limit"
  recursive_scanning?: boolean // no agnai equivalent. whether entry content can trigger other entries
  extensions: Record<string, any>
  entries: Array<{
    keys: Array<string>
    content: string
    extensions: Record<string, any>
    enabled: boolean
    insertion_order: number // if two entries inserted, lower "insertion order" = inserted higher
    case_sensitive?: boolean

    // FIELDS WITH NO CURRENT EQUIVALENT IN SILLY
    name?: string // not used in prompt engineering
    priority?: number // if token budget reached, lower priority value = discarded first

    // FIELDS WITH NO CURRENT EQUIVALENT IN AGNAI
    id?: number // not used in prompt engineering
    comment?: string // not used in prompt engineering
    selective?: boolean // if `true`, require a key from both `keys` and `secondary_keys` to trigger the entry
    secondary_keys?: Array<string> // see field `selective`. ignored if selective == false
    constant?: boolean // if true, always inserted in the prompt (within budget limit)
    position?: 'before_char' | 'after_char' // whether the entry is placed before or after the character defs
  }>
}

type TavernCard = TavernCardV1 | TavernCardV2
*/
