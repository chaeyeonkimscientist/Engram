from sentence_transformers import SentenceTransformer

from engram.config import EMBED_MODEL

_model = SentenceTransformer(EMBED_MODEL)


def embed(texts: list[str]) -> list[list[float]]:
    vectors = _model.encode(texts)
    return [vector.tolist() for vector in vectors]
