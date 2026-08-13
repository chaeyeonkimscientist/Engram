MongoDB is a source-available, cross-platform, document-oriented database program. Classified as a NoSQL database product, MongoDB uses JSON-like documents (called BSON) with optional schemas. Released in February 2009 by 10gen (now MongoDB Inc.), it supports features like sharding, replication, and ACID transactions (from version 4.0). MongoDB Atlas, its managed cloud service, operates on AWS, Google Cloud Platform, and Microsoft Azure. Current versions are licensed under the Server Side Public License (SSPL). MongoDB is a member of the MACH Alliance.

History

The American software company 10gen began developing MongoDB in 2007 as a component of a planned platform-as-a-service product. In 2009, the company shifted to an open-source development model and began offering commercial support and other services. In 2013, 10gen changed its name to MongoDB Inc.

On October 20, 2017, MongoDB became a publicly traded company, listed on NASDAQ as MDB with an IPO price of $24 per share.

On November 8, 2018, with the stable release 4.0.4, the software's license changed from AGPL 3.0 to SSPL.

On October 30, 2019, MongoDB teamed with Alibaba Cloud to offer Alibaba Cloud customers a MongoDB-as-a-service solution. Customers can use the managed offering from Alibaba's global data centers.

In December 2025, a major exploit was discovered and titled "MongoBleed". This exploit led to the compromise of many corporate servers.

Background

As of May 2025, MongoDB was the fifth most popular database software. It focuses mostly on managing large databases of unstructured, "messy" data. It's typically used for mobile and web apps that commonly use unstructured databases. As of 2024, there were 50,000 MongoDB customers. MongoDB was originally best known as a NoSQL database product. The company released a database as-a-service product called Atlas in 2016 that became 70 percent of MongoDB's revenue by 2024. Over time, MongoDB added analytics, transactional databases, encryption, vector databases, ACID, migration features, and other enterprise tools. Initially, the MongoDB software was free and open source under the AGPL license. MongoDB adopted an SSPL (server side public license) for future releases starting in 2018.

Main features

Ad-hoc queries

MongoDB implements its own query language called Mongo Query Language (MQL). MongoDB supports field, range query and regular-expression searches. Queries can return specific fields of documents and also include user-defined JavaScript functions. Queries can also be configured to return a random sample of results of a given size.

Indexing

Fields in a MongoDB document can be indexed with primary and secondary indices.

Replication

MongoDB provides high availability with replica sets. A replica set consists of two or more copies of the data. Each replica-set member may act in the role of primary or secondary replica at any time. All writes and reads are done on the primary replica by default. Secondary replicas maintain a copy of the data of the primary using built-in replication. When a primary replica fails, the replica set automatically conducts an election process to determine which secondary should become the primary. Secondaries can optionally serve read operations, but that data is only eventually consistent by default.

If the replicated MongoDB deployment only has a single secondary member, a separate daemon called an arbiter must be added to the set. It has the single responsibility of resolving the election of the new primary. As a consequence, an ideal distributed MongoDB deployment requires at least three separate servers, even in the case of just one primary and one secondary.

Load balancing

MongoDB scales horizontally using sharding. The user chooses a shard key, which determines how the data in a collection will be distributed. The data is split into ranges (based on the shard key) and distributed across multiple shards, which are masters with one or more replicas. Alternatively, the shard key can be hashed to map to a shard – enabling an even data distribution.

MongoDB can run over multiple servers, balancing the load or duplicating data to keep the system functional in case of hardware failure.

File storage

MongoDB can be used as a file system, called GridFS, with load-balancing and data-replication features over multiple machines for storing files.

This function, called a grid file system, is included with MongoDB drivers. MongoDB exposes functions for file manipulation and content to developers. GridFS can be accessed using the mongofiles utility or plugins for nginx and lighttpd. GridFS divides a file into parts, or chunks, and stores each of those chunks as a separate document.

Aggregation

MongoDB provides three ways to perform aggregation: the aggregation pipeline (preferred), the map-reduce function (deprecated as of MongoDB 5.0) and single-purpose aggregation methods.

Map-reduce can be used for batch processing of data and aggregation operations. However, according to MongoDB's documentation, the aggregation pipeline provides better performance for most aggregation operations.

The aggregation framework enables users to obtain results similar to those returned by queries that include the SQL GROUP BY clause. Aggregation operators can be strung together to form a pipeline, analogous to Unix pipes. The aggregation framework includes the $lookup operator, which can join documents from multiple collections, as well as statistical operators such as standard deviation.
