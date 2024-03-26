#!/usr/bin/env node
/**
# [participant.js](source/participant.js)
> The base of the auction demo.

Author: Anadian

Code license: MIT
```
	Copyright 2022 Anadian
	Permission is hereby granted, free of charge, to any person obtaining a copy of this 
software and associated documentation files (the "Software"), to deal in the Software 
without restriction, including without limitation the rights to use, copy, modify, 
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to 
permit persons to whom the Software is furnished to do so, subject to the following 
conditions:
	The above copyright notice and this permission notice shall be included in all copies 
or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
Documentation License: [![Creative Commons License](https://i.creativecommons.org/l/by-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-sa/4.0/)
> The source-code comments and documentation are written in [GitHub Flavored Markdown](https://github.github.com/gfm/).

*/

//# Dependencies
	//## Internal
	//## Standard
	import CryptoNS from 'node:crypto';
	//## External
	//import _ from 'lodash';
	import { nanoid as NanoID } from 'nanoid'; // Just used to make IDs shorter.
	import HyperCore from 'hypercore';
	import HyperBee from 'hyperbee';
	import HyperDHT from 'hyperdht';
	import HyperswarmRPC from '@hyperswarm/rpc';
	import ParseJSON from 'parse-json';
	import HyperSwarm from 'hyperswarm';
//# Constants
const FILENAME = 'participant.js';
const PARTICIPANT_STATES = {
	BORN: 0, // Created but not yet initialised.
	INITIALISED: 1, // Initialised but not yet functioning autonomously (living).
	LIVING: 2, // Functioning and participating in auctions.
	DYING: 3, // Quiting, clean up, tear down, ending any remaining "transaction" to go offline.
	DEAD: 4 // No longer a part of the network.
};
//## Errors

//# Global Variables
/**## Functions*/
/**
### Participant
> The base instance of the auction demo.
#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object? | Additional options to pass to the smart constructor. |

##### Options Properties
| name | type | description |
| --- | --- | --- |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if `options` is neither an object nor `null` |

#### History
| version | change |
| --- | --- |
| 0.0.0 | Introduced |
*/
export default function Participant( options = {} ){
	if( !( this instanceof Participant ) ){
		return new Participant( options );
	}
	const FUNCTION_NAME = 'Participant';
	this.logger = ( this.logger || options.logger ) ?? ( { log: ( log_object ) => { console.log( "%s: %s: %s", log_object?.function, log_object?.level, log_object.message ) } } );
	this.state = ( this.state || options.state ) ?? ( PARTICIPANT_STATES.BORN ); // 0 Born, 1 Initialised, 2 Living, 3 Dying, 4 Dead.
	this.randomSalt = ( this.randomSalt || options.randomSalt ) ?? ( CryptoNS.randomBytes( 32 ) );
	this.id = ( this.id || options.id ) ?? ( NanoID() );
	/* Formerly used:
	this.participantIDBuffer = ( this.participantIDBuffer || options.participantIDBuffer ) ?? ( CryptoNS.randomBytes( 32 ) );
	this.participantIDBase64URL = ( this.participantIDBase64URL || options.participantIDBase64URL ) ?? ( this.participantIDBuffer.toString( 'base64url' ) );
	*/
	var timedate = new Date();
	this.birthTime = ( this.birthTime || options.birthTime ) ?? ( timedate.toISOString() );
	this.destroyArray = ( this.destroyArray || options.destroyArray ) ?? ( [ () => {
		console.error( "%s (%s) destroyed.", this.id, this.serverPublicKeyBase64URL );
		return Promise.resolve( true );
	} ] );
	this.pack = ( this.pack || options.pack ) ?? ( ( payload_object ) => {
		try{
			const payload_string = JSON.stringify( payload_object );
			try{
				const payload_buffer = Buffer.from( payload_string, 'utf8' );
				return payload_buffer;
			} catch(error){
				return_error = new Error(`Buffer.from threw an error: ${error}`);
				throw return_error;
			}
		} catch(error){
			return_error = new Error(`JSON.stringify threw an error: ${error}`);
			throw return_error;
		}
	} );
	this.unpack = ( this.unpack || options.unpack ) ?? ( ( payload_buffer ) => {
		try{
			const payload_string = payload_buffer.toString( 'utf8' );
			try{
				const payload_object = ParseJSON( payload_string );
				return payload_object;
			} catch(error){
				return_error = new Error(`ParseJSON threw an error: ${error}`);
				throw return_error;
			}
		} catch(error){
			return_error = new Error(`toString threw an error: ${error}`);
			throw return_error;
		}
	} );
	this.hypercorePath = ( this.hypercorePath || options.hypercorePath ) ?? ( './db/participant'+this.id );
	this.hyperbeeOptions = ( this.hyperbeeOptions || options.hyperbeeOptions ) ?? ( { keyEncoding: 'utf-8', valueEncoding: 'binary' } );
	this.dhtSeed = ( this.dhtSeed || options.dhtSeed ) ?? ( new Uint8Array( 32 ) );
	this.keyPair = ( this.keyPair || options.keyPair ) ?? ( HyperDHT.keyPair( this.dhtSeed ) );
	this.hyperdhtOptions = Object.assign( { keyPair: this.keyPair }, this?.hyperdhtOptions, options?.hyperdhtOptions );
	this.serverPublicKeyBase64URL = ( this.serverPublicKeyBase64URL || options.serverPublicKeyBase64URL ) ?? ( '' );
	this.serverPublicKey = ( this.serverPublicKey || options.serverPublicKey ) ?? ( Buffer.from( this.serverPublicKeyBase64URL, 'base64url' ) );
	this.rpcSeed = ( this.rpcSeed || options.rpcSeed ) ?? ( this.randomSalt );
	this.money = ( this.money || options.money ) ?? ( ( ( this.randomSalt[0] + 1 ) * 1000 ) );
	this.inventory = ( this.inventory || options.inventory ) ?? ( {} );
	for( var i = 0; i < 3; i++ ){
		var item_id = NanoID();
		this.inventory[item_id] = { itemID: item_id, baseValue: ( this.randomSalt[i + 1] * 5 ) };
	}
	this.peers = ( this.peers || options.peers ) ?? ( {} );
	this.knownAuctions = ( this.knownAuctions || options.knownAuctions ) ?? ( {} );
	this.ownedAuctions = ( this.ownedAuctions || options.ownedAuctions ) ?? ( [] );
	this.swarmSeed = ( this.swarmSeed || options.swarmSeed ) ?? ( this.randomSalt );
	this.anyEventFunction = ( this.anyEventFunction || options.anyEventFunction ) ?? ( function( event_name, ...rest ){ const arguments_array = Array.from( rest ); console.log( "Swarm: %s event: %s rest: %O", this.id, event_name, arguments_array ); } );
	var topic_u8a = new Uint8Array( 32 );
	const topic_string = 'AUCTIONS';
	for( var i = 0; i < topic_string.length; i++ ){
		topic_u8a[i] = ( topic_string.codePointAt(i) % 256 );
	}
	this.swarmTopic = ( this.swarmTopic || options.swarmTopic ) ?? ( topic_u8a );
	this.swarmJoinOptions = ( this.swarmJoinOptions || options.swarmJoinOptions ) ?? ( { server: true, client: true } );

	return this;
}
/**
### Participant.createAsync
> Asynchronously creates a new `Participant` instance.

#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves to the new `Participant` instance. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.createAsync = function( options = {} ){
	const FUNCTION_NAME = 'Participant.createAsync';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	console.log(`${FUNCTION_NAME}: debug: received: ${arguments_array}`);
	//Parametre checks
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	var participant = new Participant( options );
	participant.hypercore = ( participant.hypercore || options.hypercore ) ?? ( new HyperCore( participant.hypercorePath ) );
	_return = participant.hypercore.ready().then(
		() => {
			participant.destroyArray.push( () => {
				console.log( "%s destroy: hypercore.close", participant.id );
				return participant.hypercore.close();
			} );
			participant.hyperbee = ( participant.hyperbee || options.hyperbee ) ?? ( new HyperBee( participant.hypercore, participant.hyperbeeOptions ) );
			return participant.hyperbee.ready().then(
				() => {
					participant.destroyArray.push( () => {
						console.log( "%s destroy: hyperbee.close", participant.id );
						return participant.hyperbee.close();
					} );
					participant.dht = ( participant.dht || options.dht ) ?? ( new HyperDHT( participant.hyperdhtOptions ) );
					return participant.dht.ready().then(
						() => {
							participant.destroyArray.push( () => {
								console.log( "%s destroy: dht.destroy", participant.id );
								return participant.dht.destroy();
							} );
							participant.rpcOptions = ( participant.rpcOptions || options.rpcOptions ) ?? ( { seed: participant.rpcSeed, dht: participant.dht } );
							participant.rpc = ( participant.rpc || options.rpc ) ?? ( new HyperswarmRPC( participant.rpcOptions ) );
							participant.destroyArray.push( () => {
								console.log( "%s destroy: rpc.destroy", participant.id );
								return participant.rpc.destroy();
							} );
							participant.rpcServer = ( participant.rpcServer || options.rpcServer ) ?? ( participant.rpc.createServer() );
							//Swarm
							participant.swarmOptions = ( participant.swarmOptions || options.swarmOptions ) ?? ( { seed: participant.swarmSeed, dht: participant.dht } );
							participant.swarm = ( participant.swarm || options.swarm ) ?? ( new HyperSwarm( participant.swarmOptions ) );
							participant.destroyArray.push( () => {
								console.log( "%s destroy: swarm.destroy", participant.id );
								return participant.swarm.destroy();
							} );
							participant.swarm.on( 'open', participant.anyEventFunction.bind( participant, 'open' ) );
							participant.swarm.on( 'close', participant.anyEventFunction.bind( participant, 'close' ) );
							participant.swarm.on( 'listen', participant.anyEventFunction.bind( participant, 'listen' ) );
							participant.swarm.on( 'listening', participant.anyEventFunction.bind( participant, 'listening' ) );
							participant.swarm.on( 'bootstrap', participant.anyEventFunction.bind( participant, 'bootstrap' ) );
							participant.swarm.on( 'ready', participant.anyEventFunction.bind( participant, 'ready' ) );
							participant.swarm.on( 'persistent', participant.anyEventFunction.bind( participant, 'persistent' ) );
							participant.swarm.on( 'wake-up', participant.anyEventFunction.bind( participant, 'wake-up' ) );
							participant.swarm.on( 'network-change', participant.anyEventFunction.bind( participant, 'network-change' ) );
							participant.swarm.on( 'nat-update', participant.anyEventFunction.bind( participant, 'nat-update' ) );
							participant.swarm.on( 'connect', participant.anyEventFunction.bind( participant, 'connect' ) );
							//participant.swarm.on( 'connection', participant.anyEventFunction.bind( participant, 'connection' ) );
							participant.swarm.on( 'update', participant.anyEventFunction.bind( participant, 'update' ) );
							participant.swarm.on( 'flush', participant.anyEventFunction.bind( participant, 'flush' ) );
							participant.swarm.on( 'announce', participant.anyEventFunction.bind( participant, 'announce' ) );
							participant.swarm.on( 'join', participant.anyEventFunction.bind( participant, 'join' ) );
							participant.swarm.on( 'request', participant.anyEventFunction.bind( participant, 'request' ) );
							participant.swarm.on( 'connection', ( connection ) => {
								const peer_key = connection.remotePublicKey.toString( 'base64url' );
								participant.peers[peer_key] = { confirmed: false };
								console.log( "%s (key: %s) received a connection from %s", participant.id, participant.serverPublicKeyBase64URL, peer_key );
							} );
							participant.peerDiscovery = ( participant.peerDiscovery || options.peerDiscovery ) ?? ( participant.swarm.join( participant.swarmTopic, participant.swarmJoinOptions ) );
							var peer_discovery_flushed_promise = participant.peerDiscovery.flushed().then(
								() => {
									participant.destroyArray.push( () => {
										console.log( "%s destroy: peerDiscovery.destroy", participant.id );
										return participant.peerDiscovery.destroy();
									} );
									var rpc_server_listen_promise = participant.rpcServer.listen().then(
										() => {
											participant.serverPublicKeyBase64URL = participant.rpcServer.publicKey.toString( 'base64url' )
											console.log( "%s server publicKey (base64url): %s", participant.id, participant.serverPublicKeyBase64URL );
											participant.rpcServer.respond( 'greet', ( request_buffer ) => {
												const request_object = participant.unpack( request_buffer );
												console.log( "greet: %s received: %O", participant.serverPublicKeyBase64URL, request_object );
												if( participant.peers[request_object.requesterPublicKey] == undefined ){ // We've never encountered this peer before.
													console.log( "%s greet: new peer: %s", participant.serverPublicKeyBase64URL, request_object.requesterPublicKey );
													participant.peers[request_object.requesterPublicKey] = request_object;
												}
												participant.peers[request_object.requesterPublicKey].greetReceived = true;
												var datetime = new Date();
												var response_object = Object.assign( {}, request_object, {
													respondTime: datetime.toISOString(),
													responderID: participant.id,
													responderPublicKey: participant.serverPublicKeyBase64URL
												} );
												console.log( "%s greet: send %O", participant.serverPublicKeyBase64URL, response_object );
												const response_buffer = participant.pack( response_object );
												return response_buffer;
											} );
											participant.rpcServer.respond( 'request-auction', ( request_buffer ) => {
												const request_object = participant.unpack( request_buffer );
												console.log( "request-auction: %s received: %O", participant.serverPublicKeyBase64URL, request_object );
												const datetime = new Date();
												var response_object = Object.assign( {}, request_object, {
													respondTime: datetime.toISOString(),
													responderID: participant.id,
													responderPublicKey: participant.serverPublicKeyBase64URL,
													knownAuctions: participant.knownAuctions
												} );
												console.log( "%s request-auction: send:  %O", participant.serverPublicKeyBase64URL, response_object );
												const response_buffer = participant.pack( response_object );
												return response_buffer;
											} );
											participant.rpcServer.respond( 'open-auction', ( request_buffer ) => {
												const request_object = participant.unpack( request_buffer );
												console.log( "%s open-auction received: %O", participant.id, request_object );
												participant.knownAuctions[request_object.auction.auctionID] = request_object.auction;
												const datetime = new Date();
												var response_object = {
													respondTime: datetime.toISOString(),
													responderID: participant.id,
													responderPublicKey: participant.serverPublicKeyBase64URL
												};
												console.log( "%s open-auction send:  %O", participant.id, response_object );
												response_object = Object.assign( request_object, response_object );
												const response_buffer = participant.pack( response_object );
												return response_buffer;
											} );
											participant.rpcServer.respond( 'close-auction', ( request_buffer ) => {
												const request_object = participant.unpack( request_buffer );
												console.log( "%s close-auction received: %O", participant.id, request_object );
												const datetime = new Date();
												var response_object = {
													respondTime: datetime.toISOString(),
													responderID: participant.id,
													responderPublicKey: participant.serverPublicKeyBase64URL
												};
												var auction_deleted = delete(participant.knownAuctions[request_object.auction.auctionID]);
												if( auction_deleted === true ){
													response_object.auctionDeleted = true;
												} else{
													response_object.error = new Error( `${participant.id} failed to delete auction ${request_object.auction.auctionID}` );
												}
												console.log( "%s close-auction send:  %O", participant.id, response_object );
												response_object = Object.assign( request_object, response_object );
												const response_buffer = participant.pack( response_object );
												return response_buffer;
											} );
											participant.rpcServer.respond( 'bid', ( request_buffer ) => {
												const request_object = participant.unpack( request_buffer );
												console.log( "bid: %s received: %O", participant.serverPublicKeyBase64URL, request_object );
												const datetime = new Date();
												var response_object = Object.assign( {}, request_object, {
													respondTime: datetime.toISOString(),
													responderID: participant.id,
													responderPublicKey: participant.serverPublicKeyBase64URL
												} );
												if( participant.knownAuctions[request_object.auctionID] != {} && typeof(participant.knownAuctions[request_object.auctionID]) === typeof({}) ){ //We know of this auction.
													var auction = participant.knownAuctions[request_object.auctionID];
													if( participant.ownedAuctions.includes( request_object.auctionID ) === true ){ //We're the auctioneer.
														/*const bid_datetime = Date( request_object.requestTime );
														if( auction.closeTime != '' && typeof(auction.closeTime) === typeof('') ){ // This Auction has closed */
														const bid_object = {
															bidTime: request_object.requestTime,
															bidderPublicKey: request_object.requesterPublicKey,
															value: request_object.value
														};
														auction.bids.push( bid_object );
														auction.bids.sort( ( a, b ) => {
															return b.value - a.value;
														} );
														auction.highestBidder = auction.bids[0].bidderPublicKey;
														auction.currentValue = auction.bids[0].value;
														participant.knownAuctions[request_object.auctionID] = auction;
														response_object.auction = auction;
														if( auction.highestBidder === request_object.requesterPublicKey ){
															response_object.bestBid = true;
														} else{
															response_object.bestBid = false;
														}
													} else{ // We don't own the auction.
														response_object.auction = auction;
														response_object.seeAuctioneer = auction.auctioneerPublicKey;
														response_object.error = new Error(`Wrong auctioneer: ${participant.serverPublicKeyBase64URL}`);
														response_object.error.code = 'ERR_AUCTION_WRONG_AUCTIONEER';
													}
												} else{ // We don't know about this auction
													response_object.error = new Error(`Auction unknown: ${request_object.auctionID}`);
													response_object.error.code = 'ERR_AUCTION_UNKOWN';
												}
												console.log( "%s bid: send:  %O", participant.serverPublicKeyBase64URL, response_object );
												const response_buffer = participant.pack( response_object );
												return response_buffer;
											} );
											participant.rpcServer.respond( 'exchange', ( request_buffer ) => {
												const request_object = participant.unpack( request_buffer );
												console.log( "exchange: %s received: %O", participant.serverPublicKeyBase64URL, request_object );
												const datetime = new Date();
												var response_object = Object.assign( {}, request_object, {
													respondTime: datetime.toISOString(),
													responderID: participant.id,
													responderPublicKey: participant.serverPublicKeyBase64URL,
													transactionConfirmed: true
												} );
												participant.money -= request_object.price;
												participant.inventory[request_object.item] = {
													acquiredTime: datetime.toISOString(),
													baseValue: request_object.price
												};
												console.log( "%s exchange: send:  %O", participant.serverPublicKeyBase64URL, response_object );
												const response_buffer = participant.pack( response_object );
												return response_buffer;
											} );
											participant.rpcServer.respond( 'farewell', ( request_buffer ) => {
												const request_object = participant.unpack( request_buffer );
												console.log( "%s farewell received: %O", participant.id, request_object );
												delete(participant.peers[request_object.requesterPublicKey]);
												const datetime = new Date();
												var response_object = Object.assign( {}, request_object, {
													respondTime: datetime.toISOString(),
													responderID: participant.id,
													responderPublicKey: participant.serverPublicKeyBase64URL
												} );
												console.log( "%s farwwell send:  %O", participant.id, response_object );
												const response_buffer = participant.pack( response_object );
												return response_buffer;
											} );
											var timedate = new Date();
											participant.initTime = ( participant.initTime || options.initTime ) ?? ( timedate.toISOString() );
											participant.state = PARTICIPANT_STATES.INITIALISED;
											return participant;
										},
										( error ) => {
											return_error = new Error(`participant.rpcServer.listen threw an error: ${error}`);
											throw return_error;
										}
									); //participant.rpcServer.listen
									participant.rpcServerListenPromise = ( participant.rpcServerListenPromise || options.rpcServerListenPromise ) ?? ( rpc_server_listen_promise );
									return participant.rpcServerListenPromise;
								},
								( error ) => {
									return_error = new Error(`participant.peerDiscovery.flushed threw an error: ${error}`);
									throw return_error;
								}
							); //participant.peerDiscovery.flushed
							return peer_discovery_flushed_promise;
						},
						( error ) => {
							return_error = new Error(`participant.dht.ready threw an error: ${error}`);
							throw return_error;
						}
					); //participant.dht.ready
				},
				( error ) => {
					return_error = new Error(`participant.hyperbee.ready threw an error: ${error}`);
					throw return_error;
				}
			); //participant.hyperbee.ready
		},
		( error ) => {
			return_error = new Error(`participant.hypercore.ready threw an error: ${error}`);
			throw return_error;
		}
	); //participant.hypercore.ready

	//Return
	console.log(`${FUNCTION_NAME}: debug: returned: ${_return}`);
	return _return;
}
/**
### Participant.prototype.destroy
> Teardown and clean up this participant.

#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves when teardown completes successfully; rejects otherwise. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.destroy = function( options = {} ){
	const FUNCTION_NAME = 'Participant.prototype.destroy';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = Promise.resolve( true );
	var return_error = null;
	this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	//Parametre checks
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	if( this.state < PARTICIPANT_STATES.DYING ){
		_return = this.sayFarewell().then(
			null,
			( error ) => {
				return_error = new Error(`${this.id} this.sayFarewell threw an error: ${error}`);
				throw return_error;
			}
		); //this.sayFarewell
	}
	//this.state = PARTICIPANT_STATES.DYING;
	var function_return;
	while( this.destroyArray.length > 0 ){
		var destroyFunction = this.destroyArray.pop();
		_return = _return.then(
			destroyFunction,
			null
		);
	}
	_return = _return.then(
		() => {
			this.state = PARTICIPANT_STATES.DEAD;
			return Promise.resolve( true );
		},
		null
	);

	//Return
	this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### Participant.prototype.greetPeer
> Greets the other participant, adding them to this participant's list of known peers in the process.

#### Parametres
| name | type | description |
| --- | --- | --- |
| peer_key | string | The peer's RPC-Server public key as a base64url-encoded string.  |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves when the peer has been successfully greeted; rejects otherwise. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.greetPeer = function( peer_key, options = {} ){
	const FUNCTION_NAME = 'Participant.prototype.greetPeer';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	console.log( "%s greeting %s", this.serverPublicKeyBase64URL, peer_key );
	//Parametre checks
	if( typeof(peer_key) !== 'string' ){
		return_error = new TypeError('Param "peer_key" is not string.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	var key = null;
	try{
		key = Buffer.from( peer_key, 'base64url' );
	} catch(error){
		return_error = new Error(`Buffer.from threw an error: ${error}`);
		throw return_error;
	}
	const datetime = new Date();
	var request_object = {
		requestTime: datetime.toISOString(),
		requesterID: this.id,
		requesterPublicKey: this.serverPublicKeyBase64URL
	};
	console.log( "%s greetPeer %s: send: %O", this.serverPublicKeyBase64URL, peer_key, request_object ); 
	const request_buffer = this.pack( request_object );
	_return = this.rpc.request( key, 'greet', request_buffer ).then(
		( response_buffer ) => {
			const response_object = this.unpack( response_buffer );
			this.peers[response_object.responderPublicKey] = Object.assign( {}, this.peers[response_object.responderPublicKey], response_object, { greetSent: true } );
			console.log( "%s greetPeer: %s responded with %O", this.serverPublicKeyBase64URL, peer_key, response_object );
		},
		/*( error ) => {
			return_error = new Error(`this.rpc.request threw an error: ${error}`);
			throw return_error;
		}*/
		null
	); //this.rpc.request

	//Return
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### Participant.prototype.requestAuctions
> Request the peer with the given key share their list of known auctions with this participant.

#### Parametres
| name | type | description |
| --- | --- | --- |
| peer_key | string | The peer_key of the peer to ask about auctions as a base64url-encoded string.  |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves when the list of known auctions has been updated. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.requestAuctions = function( peer_key, options = {} ){
	const FUNCTION_NAME = 'Participant.prototype.requestAuctions';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	console.log( "%s request-auction %s", this.serverPublicKeyBase64URL, peer_key );
	//Parametre checks
	if( typeof(peer_key) !== 'string' ){
		return_error = new TypeError('Param "peer_key" is not string.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	const key = Buffer.from( peer_key, 'base64url' );
	const datetime = new Date();
	var request_object = {
		requestTime: datetime.toISOString(),
		requesterID: this.id,
		requesterPublicKey: this.serverPublicKeyBase64URL,
	};
	const request_buffer = this.pack( request_object );
	_return = this.rpc.request( key, 'request-auction', request_buffer ).then(
		( response_buffer ) => {
			const response_object = this.unpack( response_buffer );
			console.log( "%s requestAuctions received %O", this.id, response_object );
			if( response_object.knownAuctions != {} && typeof(response_object.knownAuctions) === typeof({}) ){
				for( const auction_key of Object.keys( response_object.knownAuctions ) ){
					var other_auction = response_object.knownAuctions[auction_key];
					if( other_auction != {} && typeof(other_auction) === typeof({}) ){
						if( this.knownAuctions[auction_key] != {} && typeof(this.knownAuctions[auction_key]) === typeof({}) ){
							if( new Date(this.knownAuctions[auction_key].recentBidTime) > new Date(other_auction.recentBidTime) ){
								this.knownAuctions[auction_key] = other_auction;
							}
						} else{
							this.knownAuctions[auction_key] = response_object.knownAuctions[auction_key];
						}
					} else{
						console.error( "%s requestAuctions: received a bad key %s from %s", this.id, auction_key, response_object.responderID );
					}
				}
			} else{
				console.log( "%s requestAuctions: didn't receive any auctions from %s", this.id, peer_key );
			}
		},
		( error ) => {
			return_error = new Error(`this.rpc.request threw an error: ${error}`);
			throw return_error;
		}
	); //this.rpc.request

	//Return
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### Participant.prototype.openAuction
> Announce the opening of an auction to all known peers of this participant.

#### Parametres
| name | type | description |
| --- | --- | --- |
| auction_info | object | |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves when the auction opens. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.openAuction = function( auction_info = {}, options = {} ){
	const FUNCTION_NAME = 'Participant.prototype.openAuction';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	var promise_array = [];
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	console.log( "%s open-auction %O", this.serverPublicKeyBase64URL, auction_info );
	//Parametre checks
	if( typeof(auction_info) !== 'object' ){
		return_error = new TypeError('Param "auction_info" is not an object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	const datetime = new Date();
	//const auction_id_buffer = CryptoNS.randomBytes( 32 );
	const auction_id = NanoID();
	const items = Object.keys(this.inventory);
	const item_id = items[ auction_id.codePointAt( 0 ) % items.length ]; 
	var auction = Object.assign( {}, {
		auctionID: auction_id,
		openTime: datetime.toISOString(),
		auctioneerID: this.id,
		auctioneerPublicKey: this.serverPublicKeyBase64URL,
		itemID: item_id,
		recentBidTime: datetime.toISOString(),
		currentValue: this.inventory[item_id].baseValue,
		bids: [ 
			{ 
				bidTime: datetime.toISOString(),
				bidderPublicKey: this.serverPublicKeyBase64URL,
				value: this.inventory[item_id].baseValue
			}
		]
	}, auction_info );
	this.knownAuctions[auction_id] = auction;
	this.ownedAuctions.push( auction_id );
		
	var request_object = {
		requestTime: datetime.toISOString(),
		requesterID: this.id,
		requesterPublicKey: this.serverPublicKeyBase64URL,
		auction: auction
	};
	const request_buffer = this.pack( request_object );
	for( const peer_key of Object.keys(this.peers) ){
		const key = Buffer.from( peer_key, 'base64url' );
		var request_promise = this.rpc.request( key, 'open-auction', request_buffer ).then(
			( response_buffer ) => {
				const response_object = this.unpack( response_buffer );
				console.log( "%s open-auction %s: received response: %O", this.serverPublicKeyBase64URL, peer_key, response_object );
			},
			( error ) => {
				return_error = new Error(`this.rpc.request threw an error: ${error}`);
				throw return_error;
			}
		); //this.rpc.request
		promise_array.push( request_promise );
	}
	_return = Promise.all( promise_array );

	//Return
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### Participant.prototype.closeAuction
> Closes an open auction.

#### Parametres
| name | type | description |
| --- | --- | --- |
| auction_id | string | The `auctionID` of the auction to close.  |
| options_object | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves to the closed auction's final state. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.closeAuction = function( auction_id, options_object = {} ){
	const FUNCTION_NAME = 'Participant.prototype.closeAuction';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	var promise_array = [];
	var request_promise = null
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	//Parametre checks
	if( typeof(auction_id) !== 'string' ){
		return_error = new TypeError('Param "auction_id" is not string.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}
	if( typeof(options_object) !== 'object' ){
		return_error = new TypeError('Param "options_object" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	const index = this.ownedAuctions.indexOf( auction_id );
	if( index != -1 && typeof(index) === typeof(-1) ){ // We own this auction.
		console.log( "%s closeAuction: owns %s", this.id, auction_id );
		const datetime = new Date();
		var auction = this.knownAuctions[auction_id];
		console.log( "%s closing %o", this.id, auction );
		auction.closeTime = datetime.toISOString();
		const open_datetime = new Date(auction.openTime);
		const close_datetime = datetime;
		var bids_array = auction.bids.filter( ( element, index, array ) => {
			const bid_datetime = new Date(element.bidTime);
			//console.log( "open %d bid %d close %d", open_datetime, bid_datetime, close_datetime );
			if( ( bid_datetime >= open_datetime ) && ( bid_datetime < close_datetime ) ){
				return true;
			} else{
				return false;
			}
		} );
		//console.log( bids_array );
		bids_array.sort( ( a, b ) => {
			return b.value - a.value;
		} );
		auction.highestBidder = bids_array[0].bidderPublicKey;
		auction.currentValue = bids_array[0].value;
		var request_object = {
			requestTime: datetime.toISOString(),
			requesterID: this.id,
			requesterPublicKey: this.serverPublicKeyBase64URL,
			auction: auction 
		};
		var request_buffer = this.pack( request_object );
		for( const peer_key of Object.keys(this.peers) ){
			console.log( peer_key );
			const key = Buffer.from( peer_key, 'base64url' );
			request_promise = this.rpc.request( key, 'close-auction', request_buffer ).then(
				null,
				( error ) => {
					return_error = new Error(`this.rpc.request threw an error: ${error}`);
					throw return_error;
				}
			); //this.rpc.request
			promise_array.push( request_promise );
		}
		const key = Buffer.from( auction.highestBidder, 'base64url' );
		request_object.item = auction.itemID;
		request_object.price = auction.currentValue;
		request_buffer = this.pack( request_object );
		request_promise = this.rpc.request( key, 'exchange', request_buffer ).then(
			( response_buffer ) => {
				const response_object = this.unpack( response_buffer );
				console.log( "%s exchange: %s responded with %O", this.serverPublicKey, response_object.responderPublicKey, response_object );
				if( response_object.transactionConfirmed === true ){
					delete(this.inventory[request_object.item]);
					this.money += request_object.price;
				}
			},
			( error ) => {
				return_error = new Error(`this.rpc.request threw an error: ${error}`);
				throw return_error;
			}
		); //this.rpc.request
		promise_array.push( request_promise );
		_return = Promise.all( promise_array ).then(
			() => {
				console.log( "Deleting auction %s: %O", auction_id, auction ); 
				this.ownedAuctions.splice( index, 1 );
				delete(this.knownAuctions[auction_id]);
			},
			( error ) => {
				return_error = new Error(`Promise.all threw an error: ${error}`);
				throw return_error;
			}
		); //Promise.all
	} else{
		return_error = new Error( `This participant (${this.serverPublicKeyBase64URL}) doesn't own the given auction (${auction_id}); owned auctions: ${this.ownedAuctions.join()}` );
		throw return_error;
	}

	//Return
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### Participant.prototype.placeBid
> Place a bid on an open auction.

#### Parametres
| name | type | description |
| --- | --- | --- |
| auction_id | string | The ID of the auction to bid on.  |
| bid_value | number | How much of this participant's money to bid towards the auction.  |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves when the bid as been successfully placed; it resolves to `true` if the bid is currently the highest bid placed and `false` if not. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.placeBid = function( auction_id, bid_value, options = {} ){
	const FUNCTION_NAME = 'Participant.prototype.placeBid';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return;
	var return_error = null;
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	//Parametre checks
	if( typeof(auction_id) !== 'string' ){
		return_error = new TypeError('Param "auction_id" is not string.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}
	if( typeof(bid_value) !== 'number' ){
		return_error = new TypeError('Param "bid_value" is not number.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	if( this.knownAuctions[auction_id] != {} && typeof(this.knownAuctions[auction_id]) === typeof({}) ){
		console.log( "%s placeBid: know of auction %s", this.id, auction_id );
		var auction = this.knownAuctions[auction_id];
		const key = Buffer.from( auction.auctioneerPublicKey, 'base64url' );
		const datetime = new Date();
		const request_object = {
			requestTime: datetime.toISOString(),
			requesterID: this.id,
			requesterPublicKey: this.serverPublicKeyBase64URL,
			auctionID: auction_id,
			value: bid_value
		};
		const request_buffer = this.pack( request_object );
		_return = this.rpc.request( key, 'bid', request_buffer ).then(
			( response_buffer ) => {
				const response_object = this.unpack( response_buffer );
				console.log( "%s placeBid received %O", this.id, response_object );
				auction = response_object.auction;
				this.knownAuctions[auction_id] = auction;
				if( response_object.bestBid === true ){
					return true;
				} else{
					return false;
				}
			},
			( error ) => {
				return_error = new Error(`this.rpc.request threw an error: ${error}`);
				throw return_error;
			}
		); //this.rpc.request
	} else{
		console.error( "%s placeBid: unknown auction: %O", this.id, this.knownAuctions[auction_id] );
		return_error = new Error( `placeBid: This participant (${this.id}) doesn't know of the given auction (${auction_id}): known auctions: ${Object.keys(this.knownAuctions).join()}` );
		throw return_error;
	}

	//Return
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### Participant.prototype.sayFarewell
> Close an remaining auctions and say goodbye to peers.

#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves to `true` when this participant has successfully signed off. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.sayFarewell = function( options = {} ){
	const FUNCTION_NAME = 'Participant.prototype.sayFarewell';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	var close_auction_array = [];
	var close_auction_promise = null;
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	//Parametre checks
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	this.state = PARTICIPANT_STATES.DYING;
	if( this.ownedAuctions.length > 0 ){
		for( const auction_id of this.ownedAuctions ){
			close_auction_promise = this.closeAuction( auction_id ).then(
				null,
				( error ) => {
					return_error = new Error(`${this.id} sayFarewell: this.closeAuction(${auction_id}) threw an error: ${error}`);
					console.error( return_error );
					throw return_error;
				}
			); //this.closeAuction
			close_auction_array.push( close_auction_promise );
		}
	}
	const datetime = new Date();
	const request_object = {
		requestTime: datetime.toISOString(),
		requesterID: this.id,
		requesterPublicKey: this.serverPublicKeyBase64URL
	};
	const request_buffer = this.pack( request_object );
	var request_promise_array = [];
	for( const peer_key of Object.keys( this.peers ) ){
		const key = Buffer.from( peer_key, 'base64url' );
		var request_promise = this.rpc.request( key, 'farewell', request_buffer ).then(
			( response_buffer ) => {
				const response_object = this.unpack( response_buffer );
				console.log( "%s sayFarewell: %s responded with %O", this.id, peer_key, response_object );
				delete(this.peers[peer_key]);
			},
			( error ) => {
				return_error = new Error(`${this.id} sayFarewell: this.rpc.request threw an error: ${error}`);
				console.error( return_error );
				throw return_error;
			}
		); //this.rpc.request
		request_promise_array.push( request_promise );
	}
	_return = Promise.all( close_auction_array ).then(
		() => {
			return Promise.all( request_promise_array ).then(
				null,
				( error ) => {
					return_error = new Error(`${this.id} sayFarewell: Promise.all(requeest) threw an error: ${error}`);
					throw return_error;
				}
			); //Promise.all
		},
		( error ) => {
			return_error = new Error(`${this.id} sayFarewell: Promise.all(closeAuction) threw an error: ${error}`);
			throw return_error;
		}
	); //Promise.all


	//Return
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### Participant.prototype.participate
> 

#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which settles when done participation. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
Participant.prototype.participate = async function( options = {} ){
	const FUNCTION_NAME = 'Participant.prototype.participate';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	var promise_array = [];
	var random_int = 0;
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	console.log( "%s: %s (%d) received: %O", FUNCTION_NAME, this.serverPublicKeyBase64URL, this.state, options );
	//Parametre checks
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	if( this.state === PARTICIPANT_STATES.LIVING ){
		for( const key of Object.keys( this.peers ) ){
			console.log( "%s participate: checking %s", this.serverPublicKeyBase64URL, key );
			if( this.peers[key].confirmed === true ){
				console.log( "%s participate: %s is confirmed.", this.serverPublicKeyBase64URL, key );
				promise_array.push( this.requestAuctions( key ) );
			} else{
				console.log( "%s participate: %s is unconfirmed.", this.serverPublicKeyBase64URL, key );
				if( this.peers[key].greetSent === true ){ // Ask about auctions.
					if( this.peers[key].greetReceived === true ){
						console.log( "%s participate: confirming %s", this.serverPublicKeyBase64URL, key );
						this.peers[key].confirmed = true;
					}
				} else{ // Greet unconfirmed peers.
					promise_array.push( this.greetPeer( key ) );
				} 
			}
		}
		var known_auctions_array = Object.keys( this.knownAuctions );
		var items = Object.keys( this.inventory );
		console.log( "%s participate: known auctions: %d", this.serverPublicKeyBase64URL, known_auctions_array.length );
		if( known_auctions_array.length > 1 ){ // We know of at least two auctions.
			random_int = CryptoNS.randomInt( 0, known_auctions_array.length );
			var auction_id = known_auctions_array[random_int];
			if( this.ownedAuctions.includes( auction_id ) === true ){
				if( this.knownAuctions[auction_id].bids.length > 1 ){
					promise_array.push( this.closeAuction( auction_id ) );
				} else{
					console.log( "%s participate: nobody's bid on %s", this.id, auction_id );
					promise_array.push( Promise.resolve( true ) );
				}
			} else{
				var bid_value = Math.floor( Math.random() * this.money );
				promise_array.push( this.placeBid( auction_id, bid_value ) );
			}
		} else if( items.length > 0 ){
				/*random_int = CryptoNS.randomInt( 0, items.length );
				var item = items[random_int];*/
				//console.log( "%s participate: putting %s up for auction starting at $%d", this.serverPublicKeyBase64URL, item.itemID, item.baseValue );
				promise_array.push( this.openAuction() );
		} else{
			console.log( "%s participate: do nothing.", this.serverPublicKeyBase64URL );
			promise_array.push( Promise.resolve( true ) );
		}
		_return = Promise.all( promise_array ).then(
			() => {
				return this;	
			},
			/*( error ) => {
				return_error = new Error(`Promise.all threw an error: ${error}`);
				throw return_error;
			}*/
			null
		); //Promise.all
	} else{
		// Farewell if needed.
		this.teardownFunction();
		this.state = PARTICIPANT_STATES.DEAD;
		_return = Promise.resolve( this );
	}

	//Return
	this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}
/**
### mainAsync
> The main execution context, asynchronous.

#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves to the exit code for the whole process. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
async function mainAsync( options = {} ){
	const FUNCTION_NAME = 'mainAsync';
	//Variables
	var arguments_array = Array.from(arguments);
	var _return = null;
	var return_error = null;
	var promise_array = [];
	const start_timestamp = Date.now();
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `received: ${arguments_array}`});
	//Parametre checks
	if( typeof(options) !== 'object' ){
		return_error = new TypeError('Param "options" is not object.');
		return_error.code = 'ERR_INVALID_ARG_TYPE';
		throw return_error;
	}

	//Function
	var participant_promise = null;
	var participants = [];
	for( var i = 0; i < 1; i++ ){
		participant_promise = Participant.createAsync( { hyperdhtOptions: { port: (40001+i), bootstrap: [ '127.0.0.1:30001' ] } } ).then(
			( participant ) => {
				participant.state = PARTICIPANT_STATES.LIVING;
				participants.push( participant );
				return participant;
			},
			( error ) => {
				return_error = new Error(`Participant.createAsync threw an error: ${error}`);
				throw return_error;
			}
		); //Participant.createAsync
		promise_array.push( participant_promise );
	}
	var interval_callback = async function(){
		var promise_array = [];
		for( var participant of participants ){
			promise_array.push( participant.participate() );
		}
		return await Promise.all( promise_array );
	}
	var start_timeout_clock = setTimeout( interval_callback, 10000 );
	var interval_clock = setInterval( interval_callback, 30000 );
	const main_cleanup = function(){
		var destroy_promise_array = [];
		for( var participant of participants ){
			destroy_promise_array.push( participant.destroy() );
		}
		try{
			clearTimeout( start_timeout_clock );
		} catch(error){
			return_error = new Error(`clearTimeout(start) threw an error: ${error}`);
			console.error( return_error );
		}
		try{
			clearTimeout( interval_clock );
		} catch(error){
			return_error = new Error(`clearTimeout(interval) threw an error: ${error}`);
			console.error( return_error );
		}
		process.exitCode = 0;
		return Promise.all( destroy_promise_array );
	};
	var end_timeout_clock = setTimeout( main_cleanup, ( 3 * 60000 ) );
	process.on( 'SIGINT', async ( signal ) => {
		console.error( "Received %s in %s", signal, FUNCTION_NAME );
		await main_cleanup();
		try{
			clearTimeout( end_timeout_clock );
		} catch(error){
			return_error = new Error(`clearTimeout threw an error: ${error}`);
			console.error( return_error );
		}
		process.exitCode = 2;
		console.error( "Exiting from SIGINT with code %d", process.exitCode );
		process.exit( process.exitCode );
	} );
	try{
		await Promise.all( promise_array );
	} catch(error){
		return_error = new Error(`await Promise.all threw an error: ${error}`);
		throw return_error;
	}

	//Return
	//this.logger.log({file: FILENAME, function: FUNCTION_NAME, level: 'debug', message: `returned: ${_return}`});
	return _return;
}

mainAsync();

// participant.js:EOF

