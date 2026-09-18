# Saul’s Podship Studio — Wan 2.2 Free Local Video Worker

## What is included in the Studio

The **Wan 2.2 jobs** button creates a ready-to-run JSON production brief for one of these open-source Alibaba models:

| Studio choice | Wan model | Use in Saul’s Podship |
|---|---|---|
| Text/image-to-video B-roll | `Wan2.2-TI2V-5B` | Original atmospheric Bible-story visuals, maps, landscapes and symbolic motion scenes |
| Detailed image-to-video scene | `Wan2.2-I2V-A14B` | Animate an owned/licensed reference image into a more detailed scene |
| Talking head from photo + audio | `Wan2.2-S2V-14B` | Generate a presenter clip from an approved portrait and authorized narration audio |

The model code and weights are Apache 2.0. Read the current upstream terms before publishing: https://github.com/Wan-Video/Wan2.2

## Crucial limitation

Wan does **not** run on Vercel. Vercel hosts the Studio website, but does not offer an NVIDIA GPU worker for this model.

Run Wan in one of these places:

1. A Windows/Linux PC with a capable NVIDIA GPU.
2. A dedicated self-hosted GPU machine.
3. A paid GPU host such as RunPod, Vast.ai, Lambda, or another provider you approve.

The model itself is free; the GPU hardware, electricity, or rented GPU time is not.

## Practical hardware

- **Wan2.2 TI2V-5B:** an RTX 4090 / 24 GB VRAM-class GPU is the practical target for 720p work.
- **Wan2.2 I2V-A14B:** heavier; use a high-memory GPU or multi-GPU workflow.
- **Wan2.2 S2V-14B:** large talking-head model; use a high-memory GPU and expect slower rendering.

If your computer has no NVIDIA GPU or has less than 16 GB VRAM, use Pexels footage + HeyGen for the immediate workflow rather than trying to run Wan locally.

## Basic official installation outline

On the GPU machine, install a current NVIDIA driver, CUDA-compatible Python environment, Git, and Python 3. Then:

```bash
git clone https://github.com/Wan-Video/Wan2.2.git
cd Wan2.2
pip install -r requirements.txt
```

The official repository gives model-download and task-specific instructions for TI2V, I2V and S2V. S2V has its own requirements file.

## How to use a job from the Studio

1. In Saul’s Podship Studio, make/review your script.
2. Select **Wan 2.2 jobs**.
3. Choose TI2V-5B, I2V-A14B, or S2V-14B.
4. Click **Download Wan job**.
5. For I2V, place your owned/licensed reference image beside the job file.
6. For S2V, place your approved portrait and authorized narration audio beside the job file.
7. Run the selected Wan workflow on the GPU machine, using the job’s prompt, format, and asset requirements.
8. Review the result for faithfulness, likeness consent, visual rights, artifacts and anachronisms before using it.

## Recommended production workflow

```text
Pexels (free stock B-roll)
          +
Wan TI2V/I2V (original custom visual scenes)
          +
HeyGen Digital Twin or Wan S2V (presenter layer)
          +
Flick / Remotion (motion graphics and editable scenes)
          =
Final vertical Reel or landscape YouTube master
```

Do not upload another person’s face or voice, or use a public figure’s likeness, without explicit permission.
