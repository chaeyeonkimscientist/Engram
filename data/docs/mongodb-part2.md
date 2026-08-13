Bug reports and criticisms
Security
Because of MongoDB's default security configuration, which allows any user full access to the database, data from tens of thousands of MongoDB installations has been stolen. Furthermore, many MongoDB servers have been held for ransom.[42][43] In September 2017, Davi Ottenheimer head of product security at MongoDB, proclaimed that measures had been taken to defend against these risks.[44]

Technical criticisms
In some failure scenarios in which an application can access two distinct MongoDB processes that cannot access each other, it is possible for MongoDB to return stale reads. It is also possible for MongoDB to roll back writes that have been acknowledged.[45] The issue was addressed in version 3.4.0, released in November 2016,[46] and applied to earlier releases from v3.2.12 onward.[47]

Before version 2.2, locks were implemented on a per-server-process basis. With version 2.2, locks were implemented at the database level.[48] Beginning with version 3.0,[49] pluggable storage engines are available, and each storage engine may implement locks differently.[49] With MongoDB 3.0, locks are implemented at the collection level for the MMAPv1 storage engine,[50] while the WiredTiger storage engine uses an optimistic concurrency protocol that effectively provides document-level locking.[51] Even with versions prior to 3.0, one approach to increase concurrency is to use sharding.[52] In some situations, reads and writes will yield their locks. If MongoDB predicts that a page is unlikely to be in memory, operations will yield their lock while the pages load. The use of lock yielding expanded greatly in version 2.2.[53]

Until version 3.3.11, MongoDB could not perform collation-based sorting and was limited to bytewise comparison via memcmp, which would not provide correct ordering for many non-English languages when used with a Unicode encoding. The issue was fixed on August 23, 2016.

Prior to MongoDB 4.0, queries against an index were not atomic. Documents that were updated while queries was running could be missed.[54] The introduction of the snapshot read concern in MongoDB 4.0 eliminated this risk.[55]

MongoDB claimed that version 3.6.4 had passed "the industry's toughest data safety, correctness, and consistency tests" by Jepsen, and that "MongoDB offers among the strongest data consistency, correctness, and safety guarantees of any database available today."[56] Jepsen, which describes itself as a "distributed systems safety research company," disputed both claims on Twitter, saying, "In that report, MongoDB lost data and violated causal by default." In its May 2020 report on MongoDB version 4.2.6, Jepsen wrote that MongoDB had only mentioned tests that version 3.6.4 had passed, and that version had 4.2.6 introduced more problems.[57] Jepsen's test summary reads in part:

Jepsen evaluated MongoDB version 4.2.6, and found that even at the strongest levels of read and write concern, it failed to preserve snapshot isolation. Instead, Jepsen observed read skew, cyclic information flow, duplicate writes, and internal consistency violations. Weak defaults meant that transactions could lose writes and allow dirty reads, even downgrading requested safety levels at the database and collection level. Moreover, the snapshot read concern did not guarantee snapshot unless paired with write concern majority—even for read-only transactions. These design choices complicate the safe use of MongoDB transactions.[58]

On May 26, Jepsen updated the report to say: "MongoDB identified a bug in the transaction retry mechanism which they believe was responsible for the anomalies observed in this report; a patch is scheduled for 4.2.8."[58] The issue has been patched as of that version, and "Jepsen criticisms of the default write concerns have also been addressed, with the default write concern now elevated to the majority concern (w:majority) from MongoDB 5.0."[59]

Alternatives
FerretDB is an open source project that converts MongoDB 5.0 wire protocol queries into SQL, allowing clients to query postgreSQL (or other databases) using the Mongo wire protocol.[60][61]

See also
	Free and open-source software portal
Couchbase – Open-source NoSQL database
Apache Cassandra – Free and open-source database management system
BSON, the binary JSON format that MongoDB uses for data storage and transfer
List of NoSQL software and tools
List of server-side JavaScript implementations
MEAN, a solutions stack using MongoDB as the database
Server-side scripting – Technique used in web development
Amazon DocumentDB, a proprietary database service designed for MongoDB compatibility
Azure Cosmos DB, a proprietary database service suite designed for multi-database compatibility including MongoDB
