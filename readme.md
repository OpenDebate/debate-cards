# Debate Cards

System to search and download debate evidence - "cards" - that are parsed from word documents. Live at [debate.cards](http://debate.cards)

## Notes 
This is project is only the backend for [debate.cards](http://debate.cards). The frontend wesbite can be found [here](https://github.com/arvind-balaji/CardDB).

If you're just trying to see how this works, `util/scrape.js` is probably what you're intrested in. The script converts word documents to html using pandoc, the resulting markup is then parsed so that cards can be split up based on heading level. The processed card is then stored along with relavant meta data.

## Requirements

* [NodeJs](http://nodejs.org) 
* [mongodb](http://mongodb.org)
* [mongo-connector](https://github.com/mongodb-labs/mongo-connector)
* [solr](http://lucene.apache.org/solr/) 5.x
* [pandoc](https://pandoc.org) 2.2.1


## Installing

Once external dependencies are installed, the project can be installed using your facorite pack manager

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
mongo-connector -m localhost:27017 -t http://localhost:8983/solr/carddb -d solr_doc_manager&
```

Pandoc also needs to be installed as a system dependency.

The server can then be started by running 
```
npm start
```
A proccess manager like [pm2](http://pm2.keymetrics.io) is recommended for production

## Public API
API documentation coming soon!
