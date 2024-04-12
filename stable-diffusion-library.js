const fetch = require('node-fetch');

function txt2img_request_template()
{
  return require('./templates/stable-diffusion-txt2img.json')
}


/**
 * 
 * @param {Object} request 
 * @param {string} baseUrl
 * @param {Object} headers 
 * @returns 
 */
async function txt2img(request, baseUrl = 'http://127.0.0.1:7860', headers = {'accept':'application/json', 'Content-Type':'application/json', 'Authorization':'Bearer YOUR_API_KEY'})
{
  try
  {
    if (!request) return txt2img_request_template()
    if (!baseUrl) baseUrl = 'http://127.0.0.1:7860'
    if (!headers) headers = {'accept':'application/json', 'Content-Type':'application/json', 'Authorization':'Bearer YOUR_API_KEY'} //  //'Authorization':'Bearer ' + process.env.STABLE_DIFFUSION_API_KEY
    baseUrl = baseUrl.replace(/\/$/, "")
    const response = await
      fetch(baseUrl + "/sdapi/v1/txt2img", {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(request)
      })
    return response.json();
  }
  catch(e)
  {
    console.log(e)
  }
}


module.exports = {
  txt2img_request_template,
  txt2img
}


/*

// Example usage:


const SD = require('./stable-diffusion-library.js')

async function test()
{
  const request = SD.txt2img()
  request.prompt = "A painting of a beautiful sunset over a calm lake."
  const response = await SD.txt2img(request,"http://127.0.0.1:45678/")
  console.log(response)
}


// Result

{
  images: [
    'BASE 64 VERSION OF AN IMAGE'
  ],
  parameters: {
    prompt: 'A painting of a beautiful sunset over a calm lake.',
    negative_prompt: '',
    styles: [],
    seed: -1,
    subseed: -1,
    subseed_strength: 0,
    seed_resize_from_h: -1,
    seed_resize_from_w: -1,
    sampler_name: '',
    batch_size: 1,
    n_iter: 1,
    steps: 50,
    cfg_scale: 7,
    width: 768,
    height: 768,
    restore_faces: true,
    tiling: true,
    do_not_save_samples: false,
    do_not_save_grid: false,
    eta: 0,
    denoising_strength: 0,
    s_min_uncond: 0,
    s_churn: 0,
    s_tmax: 0,
    s_tmin: 0,
    s_noise: 0,
    override_settings: {},
    override_settings_restore_afterwards: true,
    refiner_checkpoint: '',
    refiner_switch_at: 0,
    disable_extra_networks: false,
    comments: {},
    enable_hr: false,
    firstphase_width: 0,
    firstphase_height: 0,
    hr_scale: 2,
    hr_upscaler: '',
    hr_second_pass_steps: 0,
    hr_resize_x: 0,
    hr_resize_y: 0,
    hr_checkpoint_name: '',
    hr_sampler_name: '',
    hr_prompt: '',
    hr_negative_prompt: '',
    sampler_index: 'Euler',
    script_name: '',
    script_args: [],
    send_images: true,
    save_images: false,
    alwayson_scripts: {}
  },
  info: '{"prompt": "A painting of a beautiful sunset over a calm lake.", "all_prompts": ["A painting of a beautiful sunset over a calm lake."], "negative_prompt": "", "all_negative_prompts": [""], "seed": 3183299004, "all_seeds": [3183299004], "subseed": 1089480994, "all_subseeds": [1089480994], "subseed_strength": 0.0, "width": 768, "height": 768, "sampler_name": "Euler", "cfg_scale": 7.0, "steps": 50, "batch_size": 1, "restore_faces": true, "face_restoration_model": "CodeFormer", "sd_model_name": "turbovisionxlSuperFastXLBasedOnNew_tvxlV431Bakedvae", "sd_model_hash": "b62ddba1a6", "sd_vae_name": null, "sd_vae_hash": null, "seed_resize_from_w": -1, "seed_resize_from_h": -1, "denoising_strength": 0.0, "extra_generation_params": {}, "index_of_first_image": 0, "infotexts": ["A painting of a beautiful sunset over a calm lake.\\nSteps: 50, Sampler: Euler, CFG scale: 7.0, Seed: 3183299004, Face restoration: CodeFormer, Size: 768x768, Model hash: b62ddba1a6, Model: turbovisionxlSuperFastXLBasedOnNew_tvxlV431Bakedvae, Denoising strength: 0.0, Tiling: True, Version: v1.7.0"], "styles": [], "job_timestamp": "20240324230206", "clip_skip": 1, "is_using_inpainting_conditioning": false, "version": "v1.7.0"}'
}


*/