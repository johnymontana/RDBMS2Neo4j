# RDBMS2Neo4j

Tool for converting an existing relational database into a Neo4j property graph.


## Usage

**Note**: This makes use of the [csv firehose](https://github.com/sarmbruster/neo4j-csv-firehose) project to generate and execute Cypher scripts for importing data from a relational database to Neo4j.

1. Install the [csv firehose](https://github.com/sarmbruster/neo4j-csv-firehose) project. For simplicity, simply unzip and save [these jar files](https://dl.dropboxusercontent.com/u/67572426/firehose/firehose.zip) in the Neo4j plugins directory and then restart Neo4j.
1. `git clone https://github.com/johnymontana/RDBMS2Neo4j.git`
1. `cd RDBMS2Neo4j`
1. `git submodule init`
1. `git submodule update`
1. `npm install`
1. `npm start`