import os
import time

from dotenv import load_dotenv
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.operations import SearchIndexModel

from engram.config import (
    DB_NAME,
    EMBED_DIMS,
    VECTOR_INDEX,
    VECTOR_INDEX_READY_TIMEOUT_S,
)

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

_uri = os.environ.get("MONGODB_URI")
if not _uri:
    raise RuntimeError("MONGODB_URI is not set. Copy .env.example to .env and fill it in.")

# Short server selection timeout so the HTTP layer degrades quickly instead of
# hanging a request for the 30s default when Mongo is unreachable.
client = MongoClient(_uri, serverSelectionTimeoutMS=int(os.environ.get("MONGODB_TIMEOUT_MS", "5000")))
db = client[DB_NAME]
chunks = db["chunks"]
beliefs = db["beliefs"]
sessions = db["sessions"]
profiles = db["profiles"]


def _vector_index_model() -> SearchIndexModel:
    return SearchIndexModel(
        definition={
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": EMBED_DIMS,
                    "similarity": "cosine",
                },
                {"type": "filter", "path": "doc_id"},
            ]
        },
        name=VECTOR_INDEX,
        type="vectorSearch",
    )


def _wait_until_queryable() -> None:
    deadline = time.time() + VECTOR_INDEX_READY_TIMEOUT_S
    while time.time() < deadline:
        remaining = int(deadline - time.time())
        found = None
        for idx in chunks.list_search_indexes():
            if idx.get("name") == VECTOR_INDEX:
                found = idx
                break
        if found is None:
            print(f"vector index {VECTOR_INDEX}: not listed yet ({remaining}s left)")
        else:
            queryable = bool(found.get("queryable"))
            status = found.get("status", "?")
            print(f"vector index {VECTOR_INDEX}: status={status} queryable={queryable} ({remaining}s left)")
            if queryable:
                return
        time.sleep(1)
    raise TimeoutError(
        f"vector index {VECTOR_INDEX} was not queryable within {VECTOR_INDEX_READY_TIMEOUT_S}s"
    )


def ensure_indexes() -> None:
    chunks.create_index(
        [("doc_id", ASCENDING), ("ord", ASCENDING)],
        unique=True,
        name="doc_id_ord_unique",
    )
    beliefs.create_index(
        [("user_id", ASCENDING), ("chunk_id", ASCENDING)],
        unique=True,
        name="user_id_chunk_id_unique",
    )
    beliefs.create_index(
        [("user_id", ASCENDING), ("last_evidence_ts", ASCENDING)],
        name="user_id_last_evidence_ts",
    )
    sessions.create_index(
        [("user_id", ASCENDING), ("started_ts", DESCENDING)],
        name="user_id_started_ts",
    )
    profiles.create_index("user_id", unique=True, name="user_id_unique")

    existing = [idx.get("name") for idx in chunks.list_search_indexes()]
    if VECTOR_INDEX not in existing:
        print(f"creating vector index {VECTOR_INDEX}")
        chunks.create_search_index(_vector_index_model())
    else:
        print(f"vector index {VECTOR_INDEX} already exists")
    _wait_until_queryable()
