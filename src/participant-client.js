#!/usr/bin/env node
/**
# [participant-client.js](source/participant-client.js)
> A class implementing the "client" functionality of the auction participant.

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
	//## External
	import HyperCore from 'hypercore';
	import HyperBee from 'hyperbee';
	import HyperDHT from 'hyperdht';
	import HyperswarmRPC from '@hyperswarm/rpc';

//# Constants
const FILENAME = 'participant-client.js';
//## Errors

//# Global Variables
/**## Functions*/
/**
### ParticipantClient
> A class implementing the &quot;client&quot; functionality of the auction participant.
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
export default function ParticipantClient( options = {} ){
	if( !( this instanceof ParticipantClient ) ){
		return new ParticipantClient( options );
	}
	const FUNCTION_NAME = 'ParticipantClient';
	this.logger = ( this.logger || options.logger ) ?? ( { log: ( log_object ) => { console.log( "%s: %s: %s", log_object?.function, log_object?.level, log_object.message ) } } );
	this.participantID = ( this.participantID || options.participantID ) ?? ( 0 );
	this.hypercorePath = ( this.hypercorePath || options.hypercorePath ) ?? ( './db/participant_client' );
	this.hyperbeeOptions = ( this.hyperbeeOptions || options.hyperbeeOptions ) ?? ( { keyEncoding: 'utf-8', valueEncoding: 'binary' } );
	this.dhtSeed = ( this.dhtSeed || options.dhtSeed ) ?? ( new Uint8Array( 32 ) );
	this.keyPair = ( this.keyPair || options.keyPair ) ?? ( HyperDHT.keyPair( this.dhtSeed ) );
	this.hyperdhtOptions = Object.assign( { keyPair: this.keyPair }, this?.hyperdhtOptions, options?.hyperdhtOptions );
	this.serverPublicKeyBase64URL = ( this.serverPublicKeyBase64URL || options.serverPublicKeyBase64URL ) ?? ( '' );
	this.serverPublicKey = ( this.serverPublicKey || options.serverPublicKey ) ?? ( Buffer.from( this.serverPublicKeyBase64URL, 'base64url' ) );
	this.rpcSeed = ( this.rpcSeed || options.rpcSeed ) ?? ( new Uint8Array( 32 ) );
	return this;
}

/**
### ParticipantClient.createAsync
> Asynchronously creates and initialises a `ParticipantClient` instance.

#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves to the newly initialised `ParticipantClient` instance. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
ParticipantClient.createAsync = async function( options = {} ){
	const FUNCTION_NAME = 'ParticipantClient.createAsync';
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
	var participant_client = new ParticipantClient( options );
	participant_client.hypercore = ( participant_client.hypercore || options.hypercore ) ?? ( new HyperCore( participant_client.hypercorePath ) );
	_return = participant_client.hypercore.ready().then(
		() => {
			participant_client.hyperbee = ( participant_client.hyperbee || options.hyperbee ) ?? ( new HyperBee( participant_client.hypercore, participant_client.hyperbeeOptions ) );
			return participant_client.hyperbee.ready().then(
				() => {
					participant_client.dht = ( participant_client.dht || options.dht ) ?? ( new HyperDHT( participant_client.hyperdhtOptions ) );
					return participant_client.dht.ready().then(
						() => {
							participant_client.rpcOptions = ( participant_client.rpcOptions || options.rpcOptions ) ?? ( { dht: participant_client.dht } );
							participant_client.rpc = ( participant_client.rpc || options.rpc ) ?? ( new HyperswarmRPC( participant_client.rpcOptions ) );
							//Client stuff
							var rpc_request_promise = participant_client.rpc.request( participant_client.serverPublicKey, 'ping', Buffer.from( 'Hey.', 'utf8' ) );
							return rpc_request_promise.then(
								( response ) => {
									console.log( "Received response: %O", response );
								},
								( error ) => {
									return_error = new Error(`rpc_request_promise threw an error: ${error}`);
									throw return_error;
								}
							); //rpc_request_promise
						},
						( error ) => {
							return_error = new Error(`participant_client.dht.ready threw an error: ${error}`);
							throw return_error;
						}
					); //participant_client.dht.ready
				},
				( error ) => {
					return_error = new Error(`participant_client.hyperbee.ready threw an error: ${error}`);
					throw return_error;
				}
			); //participant_client.hyperbee.ready
		},
		( error ) => {
			return_error = new Error(`participant_client.hypercore.ready threw an error: ${error}`);
			throw return_error;
		}
	); //participant_client.hypercore.ready

	//Return
	console.log(`${FUNCTION_NAME}: debug: returned: ${_return}`);
	return _return;
}

var participant_client = ParticipantClient.createAsync( { hyperdhtOptions: { port: 50001, bootstrap: [ '127.0.0.1:30001' ] }, serverPublicKeyBase64URL: process.argv[2] } );


// participant_client.js

