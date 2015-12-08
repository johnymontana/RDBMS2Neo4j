"use strict";
var inquirer = require("inquirer"),
    request = require("request"),
    neo4j = require("neo4j"),
    async = require("async"),
    _ = require("lodash"),
    CypherBuilder = require("./buildCypher/lib/buildCypher");


var defaultBaseURL = "http://localhost:7474/";

function getFilebaseURL(answers) {

    var url = defaultBaseURL + 'csv/jdbc?url=jdbc:' + answers.sqlDatabaseFlavor + '://' + answers.sqlURL + '/' + answers.sqlDatabase + '?';

    if (answers.sqlUser) {
        url += "user=" + answers.sqlUser + "&";
    } else {
        console.error("No user specified for database!");
    }

    if (answers.sqlPassword) {
        url += "password=" + answers.sqlPassword + "&";
    }

    url += "&table=";
    console.log(url);

    return url;
}

function getMetaDataURL(answers) {

    var url = defaultBaseURL + 'csv/jdbc/meta?url=jdbc:' + answers.sqlDatabaseFlavor + '://' + answers.sqlURL + '/' + answers.sqlDatabase + '?';

    if (answers.sqlUser) {
        url += "user=" + answers.sqlUser + "&";
    } else {
        console.error("No user specified for database!");
    }

    if (answers.sqlPassword) {
        url += "password=" + answers.sqlPassword + "&";
    }


    url += 'database=' + answers.sqlDatabase;
    console.log(url);

    return url;

    //return "http://localhost:7474/csv/jdbc/meta?url=jdbc:mysql://localhost/northwind?user=root&database=northwind";
}

var questions = [
    {
        type: "confirm",
        name: "isFirehoseLocal",
        message: "Are you running the CSV firehose locally?",
        default: true
    },
    {
        type: "input",
        name: "firehoseURL",
        message: "What is the URL for the firehose?",
        when: function(answers) {
            return !answers.isFirehoseLocal
        }
    },
    {
        type: "list",
        name: "sqlDatabaseFlavor",
        message: "Select flavor of relational database",
        choices: ["MYSQL"],
        default: "MYSQL",
        filter: function(r) {
            return r.toLowerCase();
        }
    },
    {
        type: "input",
        name: "sqlURL",
        message: "What is the path to your SQL database?",
        default: "localhost"

    },
    {
        type: "input",
        name: "sqlUser",
        message: "Enter the user name for the relational database",
        default: "root"
    },
    {
        type: "password",
        name: "sqlPassword",
        message: "Enter the password for this user",
        default: ""
    },
    {
        type: "input",
        name: "neo4jURL",
        message: "Enter the path for Neo4j",
        default: "http://localhost:7474"

    },
    {
        type: "confirm",
        name: "isNeo4jAuthEnabled",
        message: "Is authentication enabled for Neo4j?",
        default: true
    },
    {
        type: "input",
        name: "neo4jUser",
        message: "Enter the Neo4j user name",
        default: "neo4j",
        when: function(answers) {
            return answers.isNeo4jAuthEnabled
        }
    },
    {
        type: "password",
        name: "neo4jPassword",
        message: "Enter the password for this user",
        default: "neo4j",
        when: function(answers) {
            return answers.isNeo4jAuthEnabled
        }
    },
    {
        type: "input",
        name: "sqlDatabase",
        message: "Enter the name of the relational database to import",
        default: "northwind"
    }
];


inquirer.prompt( questions, function( answers ) {
    console.log("\nOrder receipt:");
    console.log( JSON.stringify(answers, null, "  ") );

    var filebaseURL = getFilebaseURL(answers);
    var metaDataURL = getMetaDataURL(answers);

    request({url: metaDataURL, json: true}, function(error, response, body){
        var builder = new CypherBuilder(null, body, filebaseURL, null);
        var constraintCypher = builder.cypherConstraints(),
            loadCSVCypher = builder.buildCSVCypher();

        console.log(constraintCypher);
        console.log(loadCSVCypher);



        var db;

        if (answers.isNeo4jAuthEnabled) {

            db = new neo4j.GraphDatabase({
                url: answers.neo4jURL,
                auth: {username: answers.neo4jUser, password: answers.neo4jPassword}

            });
        } else {
            db = new neo4j.GraphDatabase(answers.neo4jURL);
        }

        var constraintStatements = constraintCypher.split(";"),
            loadCSVStatements = loadCSVCypher.split(";");

        var constraintStatementsArr = [],
            loadCSVStatementsArr = [];

        _.forEach(constraintStatements, function(statement) {
            var obj = {};
            if (statement.length > 2) {
                obj['query'] = statement;
                obj['includeStats'] = true;
                obj['resultDataContents'] = ["row", "graph"];
                constraintStatementsArr.push(obj);
            }
        });

        _.forEach(loadCSVStatements, function(statement) {
            var obj = {};
            if (statement.length > 2) {
                obj['query'] = statement;
                obj['includeStats'] = true;
                obj['resultDataContents'] = ["row", "graph"];
                loadCSVStatementsArr.push(obj);
            }
        });

        async.series([
                function(callback) {
                    // execute neo4j constraintCypher
                    //console.log(constraintStatementsArr);
                    console.log("Creating Constraints...");
                    db.cypher({queries: constraintStatementsArr}, function(err, batchResults) {
                        if (err) {
                            callback(err);
                        } else {
                            console.log("Done");
                            //console.log(batchResults);
                            callback(null, batchResults);
                        }
                    });

                },
                function(callback) {
                    // execute loadCSVCypher statements
                    //console.log(loadCSVStatementsArr);
                    console.log("Running import Cypher scripts. This may take a moment...");
                    db.cypher({queries: loadCSVStatementsArr}, function(err, batchResults) {
                        if (err) {
                            callback(err);
                        } else {
                            console.log(batchResults);
                            callback(null, batchResults)
                        }

                    })

                }
            ],
            function(err, results) {
                // final callback
                if (err) {
                    throw err;
                } else {
                    // show summary result stats
                    console.log("Success!");
                    //console.log(JSON.stringify(results, null, 2));
                }
            }
        );
    });


});