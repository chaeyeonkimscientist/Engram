MongoDB

From Wikipedia, the free encyclopedia
MongoDB

MongoDB is a source-available, cross-platform, document-oriented database program. Classified as a NoSQL database product, MongoDB uses JSON-like documents (called BSON) with optional schemas. Released in February 2009 by 10gen (now MongoDB Inc.), it supports features like sharding, replication, and ACID transactions (from version 4.0). MongoDB Atlas, its managed cloud service, operates on AWS, Google Cloud Platform, and Microsoft Azure. Current versions are licensed under the Server Side Public License (SSPL). MongoDB is a member of the MACH Alliance.

History
See also: MongoDB Inc. § History
The American software company 10gen began developing MongoDB in 2007 as a component of a planned platform-as-a-service product. In 2009, the company shifted to an open-source development model and began offering commercial support and other services. In 2013, 10gen changed its name to MongoDB Inc.[5]

On October 20, 2017, MongoDB became a publicly traded company, listed on NASDAQ as MDB with an IPO price of $24 per share.[6]

On November 8, 2018, with the stable release 4.0.4, the software's license changed from AGPL 3.0 to SSPL.[7][8]

On October 30, 2019, MongoDB teamed with Alibaba Cloud to offer Alibaba Cloud customers a MongoDB-as-a-service solution. Customers can use the managed offering from Alibaba's global data centers.[9]

In December 2025, a major exploit was discovered and titled "MongoBleed". This exploit led to the compromise of many corporate servers.[10][11]

Background
As of May 2025, MongoDB was the fifth most popular database software.[12][13] It focuses mostly on managing large databases of unstructured, "messy" data.[14][15] It's typically used for mobile and web apps that commonly use unstructured databases.[16] As of 2024, there were 50,000 MongoDB customers.[16] MongoDB was originally best known as a NoSQL database product.[17] The company released a database as-a-service product called Atlas in 2016[18] that became 70 percent of MongoDB's revenue by 2024.[16] Over time, MongoDB added analytics, transactional databases,[19] encryption,[20] vector databases,[16] ACID, migration features, and other enterprise tools.[21] Initially, the MongoDB software was free and open source[18] under the AGPL license. MongoDB adopted an SSPL (server side public license) for future releases starting in 2018.[16][22]

Main features
icon
This section needs more citations. Please help improve this section by adding citations to reliable sources. Unsourced material may be challenged and removed.
Find sources: "MongoDB" – news · newspapers · books · scholar · JSTOR (October 2025) (Learn how and when to remove this message)
Ad-hoc queries
MongoDB implements its own query language called Mongo Query Language (MQL).[23] MongoDB supports field, range query and regular-expression searches.[24] Queries can return specific fields of documents and also include user-defined JavaScript functions. Queries can also be configured to return a random sample of results of a given size.

Indexing
Fields in a MongoDB document can be indexed with primary and secondary indices.

Replication
MongoDB provides high availability with replica sets.[25] A replica set consists of two or more copies of the data. Each replica-set member may act in the role of primary or secondary replica at any time. All writes and reads are done on the primary replica by default. Secondary replicas maintain a copy of the data of the primary using built-in replication. When a primary replica fails, the replica set automatically conducts an election process to determine which secondary should become the primary. Secondaries can optionally serve read operations, but that data is only eventually consistent by default.

If the replicated MongoDB deployment only has a single secondary member, a separate daemon called an arbiter must be added to the set. It has the single responsibility of resolving the election of the new primary.[26] As a consequence, an ideal distributed MongoDB deployment requires at least three separate servers, even in the case of just one primary and one secondary.[26]

Load balancing
MongoDB scales horizontally using sharding.[27] The user chooses a shard key, which determines how the data in a collection will be distributed. The data is split into ranges (based on the shard key) and distributed across multiple shards, which are masters with one or more replicas. Alternatively, the shard key can be hashed to map to a shard – enabling an even data distribution.

MongoDB can run over multiple servers, balancing the load or duplicating data to keep the system functional in case of hardware failure.

File storage
MongoDB can be used as a file system, called GridFS, with load-balancing and data-replication features over multiple machines for storing files.

This function, called a grid file system,[28] is included with MongoDB drivers. MongoDB exposes functions for file manipulation and content to developers. GridFS can be accessed using the mongofiles utility or plugins for nginx[29] and lighttpd.[30] GridFS divides a file into parts, or chunks, and stores each of those chunks as a separate document.[31]

Aggregation
MongoDB provides three ways to perform aggregation: the aggregation pipeline (preferred), the map-reduce function (deprecated as of MongoDB 5.0) and single-purpose aggregation methods.[32]

Map-reduce can be used for batch processing of data and aggregation operations. However, according to MongoDB's documentation, the aggregation pipeline provides better performance for most aggregation operations.[33]

The aggregation framework enables users to obtain results similar to those returned by queries that include the SQL GROUP BY clause. Aggregation operators can be strung together to form a pipeline, analogous to Unix pipes. The aggregation framework includes the $lookup operator, which can join documents from multiple collections, as well as statistical operators such as standard deviation.

Capped collections
MongoDB supports fixed-size collections called capped collections. This type of collection maintains insertion order and, once the specified size has been reached, behaves like a circular queue.

Transactions
MongoDB supports multi-document ACID transactions since the 4.0 release in June 2018.[34]

Licensing
As of October 2018, MongoDB is released under the Server Side Public License (SSPL), a non-free license developed by the project. It replaces the GNU Affero General Public License. In contrast to the AGPL, the SSPL prevents anyone but MongoDB Inc. from making MongoDB "available as a service" without negotiating a separate license from MongoDb Inc. The license text specifies a condition for making MongoDB which MongoDB Inc. has claimed to be similar to AGPL, but is actually impossible to comply with. The condition states that "all programs that you use to make the Program" ... "available as a service" must be published under the SSPL. However, a core component of MongoDB called WiredTiger is licensed as GPL, and the GPL does not allow redistribution under any license except the GPL. This does not apply to the copyright holder (MongoDB Inc.). Since MongoDB's SSPL adoption in 2018, no one has ever provided MongoDB as a paid service under the SSPL license (including MongoDB Inc.).

[35][36] The SSPL was submitted for certification to the Open Source Initiative but later withdrawn.[37] In January 2021, the Open Source Initiative stated that SSPL is not an open source license.[38] The language drivers are available under an Apache License. In addition, MongoDB Inc. offers proprietary licenses for MongoDB. The last versions licensed as AGPL version 3 are 4.0.3 (stable) and 4.1.4.[39]

MongoDB has been removed from the Debian, Fedora and Red Hat Enterprise Linux distributions because of the licensing change. Fedora determined that the SSPL version 1 is not a free software license because it is "intentionally crafted to be aggressively discriminatory" towards commercial users.[40][41]

