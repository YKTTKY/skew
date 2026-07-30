# Bias and Sentiment scored per Article × Instrument

Primary analysis grain is **Article × Instrument**, then rolled up to **Story × Instrument** for comparison on the Instrument View. We rejected Story-only scores (hides outlet disagreement) and Instrument-agnostic Article scores (breaks multi-Instrument Stories such as M&A). Consequence: pipeline cost scales with linked Instruments per Article; UI must show both rollup and per-Article breakdown so Retail Traders can see the skew across Sources.
