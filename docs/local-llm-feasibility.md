# Local LLM Feasibility for Suhail

> **Audience:** the grad-project team and the SWE 496 defense committee.
> **Question:** Can — and should — we move Suhail's LLM components off OpenRouter and onto a self-hosted GPU box before the August 2026 defense?
> **Short answer:** **Yes, partially.** A *hybrid* setup (local VLM on the home RTX 5070, cloud fallback) is the highest-leverage win for the viva story without putting the project at risk. Going full-local on every module is feasible but risks Arabic-quality regressions and adds a single point of failure two months before the defense.

---

## 1. Where the LLM calls live today

A quick map of every place Suhail talks to a cloud LLM. All calls go to **OpenRouter** with the default model `google/gemini-2.5-flash-lite` (overridable via `VISION_MODEL` and `CLASSIFICATION_MODEL`).

| # | Caller | File | What it does | Tokens out (max) | Cloud-only? |
|---|--------|------|--------------|------------------|-------------|
| 1 | Scene summarize | `src/services/vision-service.ts` → `describeScene` / `describeSceneWithFaces` | VLM: image → 2–3 sentence description (with optional injected face names) | 150–200 | Yes |
| 2 | Visual QA | `vision-service.ts` → `answerVisualQuestion` | VLM: image + question → 1–2 sentence answer | 200 | Yes |
| 3 | Currency | `vision-service.ts` → `recognizeCurrency` | VLM: image → `{denomination, currency}` JSON | 100 | Yes |
| 4 | Object find | `vision-service.ts` → `detectObject` | VLM: image + target → `{found, location}` JSON | 150 | Yes |
| 5 | OCR | `vision-service.ts` → `extractText` (called by `ocr-service.ts`) | VLM as OCR engine, Arabic + English | 500 | Yes |
| 6 | Color | `vision-service.ts` → `detectColor` | VLM: image → `{colorName, hex}` JSON | 80 | Yes |
| 7 | Intent classification | `src/commands/command-router.ts` → `classifyIntent` | Small LLM: transcription → `{intent, param}` JSON, 2 s timeout | 80 | No — already has a keyword fallback |
| 8 | Transcription normalization | `src/utils/transcription-normalizer.ts` | LLM: Arabic-script English → Latin | small | No (rare path) |

**Non-LLM cloud dependency:** AWS Rekognition for face recognition (`src/services/face-service.ts`).

The single touchpoint that matters for swapping providers is `callVisionAPI` in `vision-service.ts:30` (one fetch call to OpenRouter) plus the fetch in `command-router.ts:122`. Both speak the **OpenAI chat-completions schema**, which means any OpenAI-compatible server (vLLM, llama.cpp's `llama-server`, Ollama with the OpenAI-compat shim, LM Studio) is a drop-in replacement via `OPENROUTER_API_KEY` + base-URL swap.

---

## 2. Hardware reality check

**RTX 5070 desktop:** 12 GB GDDR7, 192-bit bus, ~672 GB/s memory bandwidth, 6144 CUDA cores ([NVIDIA spec](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/), [Notebookcheck](https://www.notebookcheck.net/Official-New-Nvidia-GeForce-RTX-5070-GPU-launches-with-12-GB-GDDR7-VRAM.1284749.0.html)). The 16 GB part is the **5070 Ti**, not the 5070 — confirmed. We have **12 GB** to work with.

Practical headroom on 12 GB:
- ~9–10 GB usable after CUDA/driver overhead, KV cache, vision encoder, and OS.
- A **7B VLM at Q4_K_M** quantization weighs ~5–6 GB ([Qwen2.5-VL-7B GGUF on HF](https://huggingface.co/bartowski/Qwen_Qwen2.5-VL-7B-Instruct-GGUF)), leaving ~3–4 GB for the SigLIP-class vision tower + KV cache. Fits.
- A **7B VLM at Q8** is ~8 GB — tight; works only with short context.
- **3B VLM at Q4** is ~2 GB — leaves plenty of room and is markedly faster.

Tokens/sec on a 5070 for 7B Q4 LLMs: **~25–30 tok/s** with llama.cpp/Ollama, climbing to **50–100 tok/s** with TensorRT-LLM or AWQ on vLLM ([TechReviewer](https://www.techreviewer.com/tech-specs/nvidia-rtx-5070-gpu-for-llms/), [Hardware Corner](https://www.hardware-corner.net/gpu-ranking-local-llm/)). VLMs add the vision-encoder prefill cost on top — see §4.

**MacBook fallback:** MLX runs Qwen2.5-VL 7B on Apple Silicon, but only the M3/M4 Pro/Max class is realistically competitive on prefill. Treat the Macs as **development sandboxes**, not the production inference target. Useful for testing offline if the home box dies.

---

## 3. Model selection

### 3.1 Vision-Language Models (scene, VQA, OCR, currency, color, object-find)

| Model | Params | Q4 size | Arabic? | License | Notes |
|-------|--------|---------|---------|---------|-------|
| **Qwen2.5-VL-7B** ([HF](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct)) | 7B | ~5.5 GB | Yes (training data + OCR) | Apache-2.0 | **Default recommendation.** Beats Llama-3.2-Vision-11B on MMMU/DocVQA. Mature vLLM + llama.cpp support. |
| **Qwen2.5-VL-3B** | 3B | ~2 GB | Yes | Apache-2.0 (research-only for 3B — check) | Half the latency. Worth A/B-testing for Arabic quality. |
| **Gemma 3 4B / 12B** ([HF blog](https://huggingface.co/blog/gemma3)) | 4B / 12B | ~2.5 / ~7 GB | 140+ langs incl. Arabic | Gemma license | 128k context, SigLIP encoder, pan-and-scan for high-res. 12B is borderline at Q4 on 12 GB. |
| **MiniCPM-V 2.6 / o-2.6** ([HF](https://huggingface.co/openbmb/MiniCPM-o-2_6)) | 8B | ~5.5 GB | Yes, but weaker on Arabic | Apache-2.0 | OpenCompass avg 70.2. Strong OCR/doc understanding. |
| **Moondream 2** ([moondream.ai](https://moondream.ai/)) | 2B | ~1.5 GB (int4) | English-only | Apache-2.0 | Sub-400 ms P50 latency; **not suitable** for Arabic. Useful as an English-only speed comparator. |
| **InternVL3 / 3.5** | 2B / 4B / 8B | ~1.5–5 GB | Limited Arabic | MIT | Strong English VQA; not chosen for an Arabic-first product. |
| **Llama 3.2 Vision 11B** | 11B | ~7 GB | OK | Llama community license | Underperforms Qwen2.5-VL-7B at larger size. Skip. |
| **AIN-7B** (MBZUAI, [news](https://mbzuai.ac.ae/news/what-it-takes-to-teach-a-machine-to-see-in-arabic/)) | 7B | ~5 GB (estim.) | **Arabic-first** | research | Built specifically for Arabic; 76% preference vs GPT-4o in blind study (200 Arabic speakers). **Worth piloting** as the scene/VQA model for the Arabic flow. |
| **Qari-OCR v0.2** ([arXiv 2506.02295](https://arxiv.org/html/2506.02295v1)) | 2B (Qwen2-VL fine-tune) | ~1.5 GB | **Arabic OCR** | Apache-2.0 | WER 0.160, CER 0.061 on diacritic-heavy Arabic. **Top pick for OCR.** |

**Picks for the 5070, in priority order:**
1. **Qwen2.5-VL-7B Q4_K_M** for scene, VQA, currency, object-find, color. One model handles 5 of 6 vision tasks.
2. **Qari-OCR-2B** for OCR (Arabic gain over the 7B generalist is large; 2 GB extra VRAM is manageable, or run sequentially).
3. **AIN-7B** as a Plan-B scene/VQA model if Qwen2.5-VL's Arabic outputs disappoint in testing — swap is a config change.

### 3.2 Small LLM for intent classification

The classifier is text-only, 80 output tokens, and runs in parallel with photo capture. A **1B–3B** model is sufficient.

| Model | Size | TTFT target | Notes |
|-------|------|-------------|-------|
| **Qwen 2.5 1.5B-Instruct** | 1.5B | <100 ms | Multilingual incl. Arabic; trivial to slot into vLLM. **Recommended.** |
| **Gemma 3 1B** | 1B | <80 ms | 140 lang; very small. |
| **Llama 3.2 3B-Instruct** | 3B | ~150 ms | English-strong; Arabic weaker. |

Running the classifier on the same GPU is cheap — a 1.5B Q4 model is ~1 GB resident, ~5–10 ms decode per token. Co-residency with the 7B VLM fits comfortably in 12 GB if managed (vLLM can host both via `--enable-lora`-style multi-model deployments, or run them as two `llama-server` processes).

### 3.3 Quantization tradeoffs

| Format | Size mult. | Quality loss vs FP16 | Best for |
|--------|-----------|----------------------|----------|
| FP16/BF16 | 1.0× | 0% | Not viable on 12 GB for 7B+vision |
| Q8 / int8 | ~0.5× | <1% | Tight fit on 12 GB for 7B |
| **Q5_K_M** | ~0.35× | ~1–2% | Recommended for VLM |
| **Q4_K_M** | ~0.28× | ~2–4% | **Default for grad project — best speed/quality** |
| Q3 / Q2 | ~0.2× | Noticeable | Skip — Arabic suffers first |
| AWQ (4-bit) | ~0.28× | Similar to Q4_K_M | Use with vLLM for max throughput |

For a graduation defense, **Q4_K_M is the right default.** Q5_K_M is a fine A/B comparison if we want a "we measured the quality cliff" slide.

---

## 4. Serving stack

| Stack | VLM support today (May 2026) | Throughput | Setup pain | Verdict |
|-------|------------------------------|------------|------------|---------|
| **vLLM** ([docs](https://docs.vllm.ai/projects/recipes/en/latest/Qwen/Qwen2.5-VL.html)) | First-class Qwen2.5-VL, Gemma3 (V1), Llama-Vision; continuous batching; AWQ/GPTQ | Highest | Linux/WSL2, Python+CUDA stack | **Production pick** — best perf, OpenAI-compatible API |
| **llama.cpp / llama-server** ([docs](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)) | Multimodal via `libmtmd`; Qwen2.5-VL, Gemma 3/4 (vision), Qwen 2.5/3 Omni | Mid | Single binary, Windows/Linux/Mac | **Prototype pick** — easiest, runs everywhere, GGUF format |
| **Ollama** ([blog](https://ollama.com/blog/multimodal-models)) | New first-class multimodal engine; Qwen2.5-VL, Gemma 3, Llama 3.2 Vision | Mid | Trivial (`ollama run qwen2.5-vl`) | Great for dev; less control than llama.cpp |
| **LM Studio** | GUI on top of llama.cpp; vision works | Mid | One-click install | Demo-friendly, useful for the viva |
| **TGI (HF Text Generation Inference)** | VLM support exists, lags vLLM | High | Docker required | Skip — vLLM is better for our case |
| **MLX / vllm-mlx** ([repo](https://github.com/waybarrios/vllm-mlx)) | Native Apple Silicon; Qwen-VL, LLaVA | Mid (laptop-grade) | Mac-only | **Fallback only** for offline Mac dev |

**Recommendation:** Develop with **Ollama** on the 5070 box (fastest path to "it works"), then migrate the production endpoint to **vLLM** for the demo. Both expose OpenAI-compatible `/v1/chat/completions` so the swap in Suhail is one env-var change.

---

## 5. Latency budget

Today's cloud baseline (`google/gemini-2.5-flash-lite` via OpenRouter):
- TTFT: ~400–900 ms
- Total for a 150-token scene description: ~800–1500 ms
- Round-trip from KSA to OpenRouter: ~100–200 ms added latency

User-facing latency budget per `CLAUDE.md`: **1.5–3 s end-to-end** (photo capture → speak).

### 5.1 Where latency goes for a local VLM call

```
Glasses → MentraOS WebSocket → Suhail server   ~100–250 ms (network + photo upload)
Suhail → local inference server (LAN/tunnel)   ~10–80 ms
Image preprocess (resize 1920×1080 → encoder)  ~50–150 ms (one-time per request)
Vision encoder prefill (SigLIP, ~400M params) ~200–500 ms on 5070
LLM prefill (text + image tokens, ~700 toks)   ~100–250 ms
LLM decode (150 tokens @ 25–80 tok/s)          ~1900 ms (slow) → ~600 ms (fast w/ vLLM+AWQ)
TTS (ElevenLabs Flash v2.5, ~75 ms TTFT)       handled in parallel of decode? No: sequential
─────────────────────────────────────────────────
Total (optimistic, vLLM + AWQ):                ~1.1–1.6 s ← fits the budget
Total (realistic, llama.cpp Q4):               ~2.0–3.0 s ← edge of budget
Total (pessimistic, large image + cold cache): ~3.5–5.0 s ← misses the budget
```

Source for prefill numbers: [vLLM GH issue #24728](https://github.com/vllm-project/vllm/issues/24728), [vLLM discussion #1438](https://discuss.vllm.ai/t/why-is-inference-for-qwen-2-5-vl-so-slow-when-we-send-an-image/1438), [GH #15869](https://github.com/vllm-project/vllm/issues/15869). Image preprocessing on Qwen2.5-VL is a known bottleneck for large inputs — **downscale to ~896×896 before sending** (the model's native tile size). Suhail already captures at `"large"` (1920×1080) — we should resize on the server before forwarding to the VLM.

### 5.2 Streaming

`session.audio.speak()` does not stream partial text, so streaming the LLM tokens doesn't help end-to-end UX. We need the **full completion** before TTS starts. This makes **decode throughput** matter more than TTFT — which slightly favors vLLM/AWQ over llama.cpp/Q4 for our use case.

### 5.3 Intent classification latency

The classifier currently has a **2 s timeout** and falls back to keywords. A local 1.5B Q4 model on the 5070 will return JSON in **~100–200 ms** TTFT + ~100 ms decode — well inside budget. **Strict win.**

---

## 6. Module-by-module recommendation

| Module | Today | Recommendation | Why |
|--------|-------|----------------|-----|
| **Intent classification** | OpenRouter (Gemini Flash Lite) | **Local — Qwen 2.5 1.5B** | Tiny, fast, removes a 2 s timeout failure path. Highest "owns the stack" credit for lowest risk. |
| **Scene summarize** | OpenRouter | **Hybrid — local Qwen2.5-VL-7B, cloud fallback** | Headline demo command. Local works; cloud fallback keeps the demo safe if the home box is offline. |
| **Visual QA** | OpenRouter | **Hybrid — local Qwen2.5-VL-7B, cloud fallback** | Same model as scene, no extra cost. |
| **OCR (Arabic + English)** | OpenRouter VLM | **Local — Qari-OCR-2B, fallback to Qwen2.5-VL-7B** | Arabic OCR is the area where a **specialist beats a generalist**. Tesseract is poor at Arabic; PaddleOCR-VL is decent but doesn't beat VLM-based OCR on diacritics ([PaddleOCR vs Tesseract](https://www.codesota.com/ocr/paddleocr-vs-tesseract), [QARI-OCR paper](https://arxiv.org/html/2506.02295v1)). |
| **Currency** | OpenRouter | **Local — Qwen2.5-VL-7B** | Same model; one prompt change. |
| **Object find** | OpenRouter | **Local — Qwen2.5-VL-7B** | Same model; spatial reasoning is fine on 7B. |
| **Color detect** | OpenRouter | **No LLM — use `sharp`** | Sample the center 64×64 region, average pixels, name via nearest CSS color. Removes a network round-trip and demonstrates that "we use AI where it's needed, not where it's not." |
| **Face recognition (single)** | AWS Rekognition | **Hybrid — InsightFace local, Rekognition fallback** | InsightFace (ArcFace + SCRFD/RetinaFace) is the open-source SOTA; deployable locally; gives a strong "we own the face stack" story. Adds 2–3 days of work. |
| **Face recognition (multi-face)** | AWS Rekognition (`DetectFaces` + per-face `SearchFacesByImage`) | **InsightFace local** | Same library handles detection + recognition in one pass — actually *simpler* than the current pipeline. |
| **Transcription normalize** | OpenRouter | **Local — Qwen 2.5 1.5B** | Same small model as classifier; reuse. |

### Why not replace face recognition with the VLM?

VLMs are bad at "is this person X" — they hallucinate names. Stick with a dedicated face-embedding model (InsightFace ArcFace + cosine similarity).

### Local OCR options compared

| Engine | Arabic accuracy | Speed | Notes |
|--------|----------------|-------|-------|
| Tesseract | Poor (F1 ~0.80 on Arabic) | Fast (CPU) | Skip — Arabic is a weakness. |
| PaddleOCR-VL 1.5 | Good (109 langs, Jan 2026 release) | Fast (CPU/GPU) | Reasonable Plan-B if Qari-OCR doesn't ship cleanly. |
| **Qari-OCR v0.2** | **SOTA open-source for diacritic Arabic** (WER 0.160) | Mid (2B VLM) | **Pick.** |
| Qwen2.5-VL-7B as OCR | Very good but generalist | Slower (7B) | Already our fallback if Qari-OCR misbehaves. |
| TrOCR | Latin-script only | Fast | Not for our use case. |

---

## 7. Implementation plan

**Total effort estimate: ~5–8 working days.** Within the 2-week cap.

### Phase 1 — Prototype on the 5070 (1 day)
1. Install **Ollama** on the Windows 5070 box (Windows native is fine; no WSL2 strictly needed for Ollama).
2. `ollama pull qwen2.5-vl:7b` and `ollama pull qwen2.5:1.5b`.
3. Smoke-test: `curl http://localhost:11434/v1/chat/completions` with an Arabic prompt + a test photo.
4. Measure TTFT and decode tok/s. Write the numbers in `docs/benchmarks.md`.

### Phase 2 — Wire Suhail to local (1 day)
1. Add two new env vars: `LOCAL_INFERENCE_BASE_URL`, `LOCAL_INFERENCE_API_KEY` (Ollama ignores the key but vLLM accepts one).
2. In `src/utils/config.ts`, expose them.
3. In `vision-service.ts:33` (`callVisionAPI`) and `command-router.ts:122`, swap the hard-coded `https://openrouter.ai/...` for a config value with cloud as the default.
4. Add a `try { local } catch { cloud }` wrapper or env-toggle. Keep the change behind a feature flag (`USE_LOCAL_LLM=true`) so we can flip back instantly during the demo if anything regresses.
5. Update `.env.example`.

### Phase 3 — Expose the home box (½ day)
1. Install **Cloudflare Tunnel** (`cloudflared`) on the 5070 box. Free, outbound-only, no port forwarding, gets a stable hostname like `inference.suhail.example.com` ([Cloudflare docs](https://developers.cloudflare.com/tunnel/)).
2. Why not Tailscale Funnel: Funnel works, but our Railway server isn't on Tailscale. Cloudflare Tunnel exposes a plain HTTPS endpoint that Railway can call directly.
3. Add an mTLS or shared-secret header to the tunnel (Cloudflare Access "service token") so random internet traffic can't burn our GPU.
4. **Latency cost of going through Cloudflare:** ~20–60 ms; negligible vs the inference time.

### Phase 4 — Migrate to vLLM (1–2 days, optional for v1)
1. Install vLLM in WSL2 (vLLM on native Windows is still rough as of May 2026 — WSL2 with CUDA passthrough is the supported path).
2. Run `vllm serve Qwen/Qwen2.5-VL-7B-Instruct --quantization awq --max-model-len 8192`.
3. Re-measure tok/s. Expect 2–3× improvement over Ollama.

### Phase 5 — Drop in Qari-OCR (½ day)
1. Add a separate Ollama/vLLM model entry for `qari-ocr`. The `extractText` path branches on whether the language is Arabic-likely.

### Phase 6 — InsightFace replacement (2–3 days, deferrable)
1. Replace AWS calls in `face-service.ts` with a Python sidecar (FastAPI + InsightFace) or use the Node.js port `@vladmandic/face-api`.
2. Store embeddings in `data/faces/embeddings.json` instead of Rekognition's external collection.
3. This is the **biggest scope item.** Defer to last — if time runs out, keep Rekognition; it still tells a clean story ("we own everything except the face DB, which is a managed service").

### Phase 7 — Graceful degradation (½ day)
- In every cloud→local call site, wrap with `Promise.race([local, timeoutAfter(2500ms)])` and fall back to OpenRouter on timeout/error.
- Add a `/api/health/local-llm` endpoint that the companion app surfaces ("On-device AI: Online / Offline").
- This is the **demo safety net** for the viva.

### Phase 8 — Documentation & defense slides (1 day)
- Architecture diagram showing the hybrid topology.
- A "where the AI runs" table for the viva.
- Latency numbers, model choices, and quality A/B tables.

---

## 8. Risks and the "is it worth it" verdict

### Pros
- **Defense story.** "We host the LLM ourselves on an RTX 5070, use Qwen2.5-VL-7B, and explain exactly why" beats "we call a cloud API." Committee can ask hard questions about quantization, prompt design, and trade-offs and we have answers.
- **Cost.** OpenRouter charges per token; this is small for a prototype but visible in any sustained demo. Local is free at the marginal call.
- **Privacy.** Images from the user's environment never leave the lab. Genuine selling point for a blind-assistance app.
- **Learning.** Multimodal inference, quantization, and serving stacks are credit-worthy curriculum.

### Cons
- **Single point of failure.** Home power outage = no demo. Mitigation: cloud fallback (Phase 7).
- **Arabic quality risk.** Qwen2.5-VL is strong but not Arabic-first. Mitigation: AIN-7B as a swappable alternative, Qari-OCR for OCR specifically.
- **Time cost.** 5–8 days against a graduation in August 2026. Mitigation: hybrid path; the cloud config keeps working at every step.
- **Mentra Live's TTS doesn't stream**, so the latency budget is dominated by **full** completion, not TTFT. This makes local less of a slam-dunk than it would be in a streaming-chat app.

### Final verdict — Hybrid

**Do this, in this order:**
1. **Intent classification → local 1.5B.** (1 day, no risk, big "we control it" wins.)
2. **Color detect → no LLM at all.** (½ day, removes a cloud call entirely.)
3. **Scene + VQA + currency + object-find → local Qwen2.5-VL-7B with cloud fallback.** (2–3 days incl. tunnel + flag.)
4. **OCR → Qari-OCR-2B local.** (½ day.)
5. **InsightFace replacement.** (Stretch goal; defer if Phase 1–4 took longer than expected.)

**Skip:** Full-local with no cloud fallback. The risk of a demo-day failure is not worth the marginal viva credit.

If we can only do **one** thing, do **#1 (intent classification)** plus **#3 (scene/VQA)** behind a feature flag. That alone is enough material for a strong "we own the AI stack" defense narrative, and it keeps OpenRouter as a working safety net.

---

## Sources

- [NVIDIA GeForce RTX 5070 Family — official specs](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/)
- [Notebookcheck — RTX 5070 12 GB GDDR7 announcement](https://www.notebookcheck.net/Official-New-Nvidia-GeForce-RTX-5070-GPU-launches-with-12-GB-GDDR7-VRAM.1284749.0.html)
- [TechReviewer — Is the RTX 5070 good for LLMs?](https://www.techreviewer.com/tech-specs/nvidia-rtx-5070-gpu-for-llms/)
- [Hardware Corner — GPU ranking for local LLMs](https://www.hardware-corner.net/gpu-ranking-local-llm/)
- [Qwen2.5-VL-7B-Instruct on Hugging Face](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct)
- [Bartowski — Qwen2.5-VL-7B GGUF quantizations](https://huggingface.co/bartowski/Qwen_Qwen2.5-VL-7B-Instruct-GGUF)
- [Gemma 3 — Hugging Face blog](https://huggingface.co/blog/gemma3)
- [Gemma 3 Technical Report (arXiv)](https://arxiv.org/html/2503.19786v1)
- [MiniCPM-o 2.6 on Hugging Face](https://huggingface.co/openbmb/MiniCPM-o-2_6)
- [Moondream 2 — official site](https://moondream.ai/)
- [MBZUAI — AIN, Arabic-first multimodal model](https://mbzuai.ac.ae/news/what-it-takes-to-teach-a-machine-to-see-in-arabic/)
- [QARI-OCR paper (arXiv 2506.02295)](https://arxiv.org/html/2506.02295v1)
- [AtlasOCR — Darija OCR (arXiv 2604.08070)](https://arxiv.org/abs/2604.08070)
- [vLLM Qwen2.5-VL Recipes](https://docs.vllm.ai/projects/recipes/en/latest/Qwen/Qwen2.5-VL.html)
- [vLLM Supported Models](https://docs.vllm.ai/en/latest/models/supported_models/)
- [vLLM issue — multimodal benchmark on A100](https://github.com/vllm-project/vllm/issues/24728)
- [vLLM discussion — Qwen2.5-VL image inference slowness](https://discuss.vllm.ai/t/why-is-inference-for-qwen-2-5-vl-so-slow-when-we-send-an-image/1438)
- [vLLM issue — Qwen2.5-VL preprocessing on large images](https://github.com/vllm-project/vllm/issues/15869)
- [Ollama — multimodal models blog](https://ollama.com/blog/multimodal-models)
- [llama.cpp multimodal docs](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)
- [vllm-mlx — Apple Silicon vLLM port](https://github.com/waybarrios/vllm-mlx)
- [BentoML — open-source VLMs in 2026](https://www.bentoml.com/blog/multimodal-ai-a-guide-to-open-source-vision-language-models)
- [Labellerr — best open-source VLMs of 2026](https://www.labellerr.com/blog/top-open-source-vision-language-models/)
- [Tesseract vs PaddleOCR vs dots.ocr — 3-way benchmark](https://www.codesota.com/ocr/paddleocr-vs-tesseract)
- [InsightFace — official site](https://www.insightface.ai/)
- [Cloudflare Tunnel docs](https://developers.cloudflare.com/tunnel/)
- [Tailscale Funnel docs](https://tailscale.com/docs/features/tailscale-funnel)
