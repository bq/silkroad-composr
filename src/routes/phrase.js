'use strict';

var express = require('express'),
    router = express.Router(),
    connection = require('../lib/corbelConnection'),
    phraseManager = require('../lib/phraseManager'),
    phraseValidator = require('../lib/phraseValidator'),
    ComposerError = require('../lib/composerError'),
    logger = require('../utils/logger'),
    auth = require('../lib/auth');

function getCorbelErrorBody(corbelErrResponse){
  var errorBody = typeof(corbelErrResponse.data) !== 'undefined' && typeof(corbelErrResponse.data.body) === 'string' && corbelErrResponse.data.body.indexOf('{') !== -1 ? JSON.parse(corbelErrResponse.data.body) : corbelErrResponse;
  return errorBody;
}
/**
 * Creates or updates a phrase
 * @param  phrase:
 * {
 *     "url": "phrase1/:pathparam",
 *     "get": {
 *         "code": "",
 *         "doc": {
 *             "description": "This method will get all songs\n",
 *             "queryParameters": {
 *                 "genre": {
 *                     "description": "filter the songs by genre"
 *                 }
 *             },
 *             "responses": {
 *                 "200": {
 *                     "body": {
 *                         "application/json": {
 *                             "schema": "{ \"$schema\": \"http://json-schema.org/schema\",\n  \"type\": \"object\",\n  \"description\": \"A canonical song\",\n  \"properties\": {\n    \"title\":  { \"type\": \"string\" },\n    \"artist\": { \"type\": \"string\" }\n  },\n  \"required\": [ \"title\", \"artist\" ]\n}\n"
 *                         },
 *                         "application/xml": null
 *                     }
 *                 }
 *             }
 *         }
 *     }
 *     "post": {
 *         ...
 *     },
 *     "put": {
 *         ...
 *     },
 *     "delete": {
 *         ...
 *     }
 * }
 * @return {promise}
 */
router.put('/phrase', function(req, res, next) {

    var authorization = auth.getAuth(req);

    var phrase = req.body || {};

    var corbelDriver = connection.getTokenDriver(authorization);

    var domain = connection.extractDomain(authorization);

    phraseValidator.validate(domain, phrase).then(function() {

        phrase.id = domain + '!' + phrase.url.replace(/\//g, '!');

        logger.debug('Storing or updating phrase', phrase.id, domain, authorization);

        corbelDriver.resources.resource(process.env.PHRASES_COLLECTION, phrase.id).update(phrase).then(function(response) {
            res.set('Location', 'phrase/' + phrase.id);
            res.status(response.status).send(response.data);
        }).catch(function(error) {
            var errorBody = getCorbelErrorBody(error);
            next(new ComposerError('error:phrase:create', errorBody, error.status));
        });

    }, function(error) {
        next(new ComposerError('error:phrase:validation', 'Error validating phrase: ' + error, 422));
    });

});

router.delete('/phrase/:phraseid', function(req, res, next) {
    var authorization = auth.getAuth(req);

    var corbelDriver = connection.getTokenDriver(authorization);

    var phraseIdentifier = connection.extractDomain(authorization) + '!' + req.params.phraseid;
    corbelDriver.resources.resource(process.env.PHRASES_COLLECTION, phraseIdentifier).delete().then(function(response) {
        res.send(response.status, response.data);
    }).catch(function(error) {
        next(new ComposerError('error:phrase:delete', error.message, error.status));
    });

});

router.get('/phrase/:phraseid', function(req, res, next) {
    var authorization = auth.getAuth(req);

    var corbelDriver = connection.getTokenDriver(authorization);

    var phraseIdentifier = connection.extractDomain(authorization) + '!' + req.params.phraseid;

    logger.debug('Trying to get phrase:', phraseIdentifier);

    corbelDriver.resources.resource(process.env.PHRASES_COLLECTION, phraseIdentifier).get().then(function(response) {
        res.send(response.status, response.data);
    }).catch(function(error) {
        var errorBody = getCorbelErrorBody(error);
        next(new ComposerError('error:phrase:get', errorBody, error.status));
    });
});

router.get('/phrase', function(req, res) {
    var authorization = auth.getAuth(req);
    res.send(phraseManager.getPhrases(connection.extractDomain(authorization)));
});

module.exports = router;
