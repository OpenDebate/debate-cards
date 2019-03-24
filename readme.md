# Debate Cards

System to search and download debate evidence - "cards" - that are parsed from word documents. Live at [debate.cards](http://debate.cards)

## Description
Word documents are converted to html using pandoc, the resulting markup is then parsed so that cards can be split up based on heading level.

Parsed data is stored in a mongo database which is indexed by Apache Solr.

Cards can then be converted back into Word documents via pandoc.

## Notes 
This is project is only the backend for [debate.cards](http://debate.cards). The frontend wesbite can be found [here](https://github.com/arvind-balaji/CardDB).

<!-- If you're just trying to see how this works, `util/scrape.js` is probably what you're intrested in. The script converts word documents to html using pandoc, the resulting markup is then parsed so that cards can be split up based on heading level. The processed card is then stored along with relavant meta data. -->

## Requirements

* [node.js](http://nodejs.org) 
* [mongodb](http://mongodb.org)
* [mongo-connector](https://github.com/mongodb-labs/mongo-connector)
* [solr](http://lucene.apache.org/solr/) 5.x
* [pandoc](https://pandoc.org) 2.2.1


## Installing

Once external dependencies are installed, the project can be installed using your favorite pack manager

```
npm install 
```
or
```
yarn install
```

## Deployment

Note: This isn't a full guide on how to deploy the project, just the gist of it. I might expand this section in the future. Feel free to open an issue in the mean time for questions.

A solr core first needs to be created, the relevent config files are located in the `solr-config` directory.
The scraping code is desgined to save data to the mongo database - in order to keep data synchronized between solr and mongo, use mongo-connector 
```
mongo-connector -m localhost:27017 -t http://localhost:8983/solr/debatecards -d solr_doc_manager&
```

Pandoc needs to be installed as a system dependency.

Place .env file in project root. Sample .env file at `.env.sample`.

The application should be ready to run at this point.

Populate the database through the REST API (`POST /file`), which will automatically add documents the parse queue.

Orginal copies of all parsed documents are stored in the directory set in the enviroment.

Each worker in the `/worker` directory is desgined to run as it's own process, which mean that can each be loaded sepeartelt if need. Might be useful if you want to run the application across multiple machines, or if you just want to disable certain features.

A proccess manager like [pm2](http://pm2.keymetrics.io) is recommended for production

## Public API
API documentation coming soon!
