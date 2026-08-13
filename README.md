# Engram

Demo and seed reading material is adapted from the
[MongoDB Wikipedia article](https://en.wikipedia.org/wiki/MongoDB),
licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Run the demo

```
python -m scripts.ingest_doc --path data/docs/mongodb-part1.md --doc-id mongodb-part1
python -m scripts.ingest_doc --path data/docs/mongodb-part2.md --doc-id mongodb-part2
python -m scripts.seed_session
python -m uvicorn engram.app:app --host 0.0.0.0 --port 8000
```

Open http://127.0.0.1:8000 — Start session, then Quiz next / Submit answer.
The heatmap is P(encoded). The quiz panel shows p_before → p_after.
