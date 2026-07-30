# AI provider port (NIM → DeepSeek)

Bias, Sentiment, Rationales, and embeddings go through an **internal AI port** (interface), not scattered vendor SDKs. **Development** targets the **NVIDIA NIM API**; the project will progress to **DeepSeek** (flash, then pro) without rewriting pipeline modules. We rejected hard-coding a single vendor and fully local models for v1. Consequence: prompts, score schemas, and embedding dimensions must stay portable; dimension changes require a re-embed migration strategy.
