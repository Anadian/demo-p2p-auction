#!/usr/bin/env node
/**
# [participant-server.js](source/participant-server.js)
> The base "server" functionality of the auction participant.

Author: Anadian

Code license: MIT
```
	Copyright 2024 Anadian
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
const FILENAME = 'participant-server.js';
//## Errors

//# Global Variables
/**## Functions*/
/**
### ParticipantServer
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
export default function ParticipantServer( options = {} ){
	if( !( this instanceof ParticipantServer ) ){
		return new ParticipantServer( options );
	}
	const FUNCTION_NAME = 'ParticipantServer';
	this.logger = ( this.logger || options.logger ) ?? ( { log: ( log_object ) => { console.log( "%s: %s: %s", log_object?.function, log_object?.level, log_object.message ) } } );
	this.participantID = ( this.participantID || options.participantID ) ?? ( 0 );
	this.hypercorePath = ( this.hypercorePath || options.hypercorePath ) ?? ( './db/hc' );
	this.hyperbeeOptions = ( this.hyperbeeOptions || options.hyperbeeOptions ) ?? ( { keyEncoding: 'utf-8', valueEncoding: 'binary' } );
	this.dhtSeed = ( this.dhtSeed || options.dhtSeed ) ?? ( new Uint8Array( 32 ) );
	this.keyPair = ( this.keyPair || options.keyPair ) ?? ( HyperDHT.keyPair( this.dhtSeed ) );
	this.hyperdhtOptions = Object.assign( { keyPair: this.keyPair }, this?.hyperdhtOptions, options?.hyperdhtOptions );
	this.rpcSeed = ( this.rpcSeed || options.rpcSeed ) ?? ( new Uint8Array( 32 ) );
	return this;
}
/**
### ParticipantServer.createAsync
> Asynchronously creates a new `ParticipantServer` instance.

#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object | [Reserved] Additional run-time options. \[default: {}\] |

#### Returns
| type | description |
| --- | --- |
| Promise | A promise which resolves to the new `ParticipantServer` instance. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if a given argument isn't of the correct type. |

#### History
| version | change |
| --- | --- |
| 0.0.1 | WIP |
*/
ParticipantServer.createAsync = async function( options = {} ){
	const FUNCTION_NAME = 'ParticipantServer.createAsync';
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
	var participant_server = new ParticipantServer( options );
	participant_server.hypercore = ( participant_server.hypercore || options.hypercore ) ?? ( new HyperCore( participant_server.hypercorePath ) );
	_return = participant_server.hypercore.ready().then(
		() => {
			participant_server.hyperbee = ( participant_server.hyperbee || options.hyperbee ) ?? ( new HyperBee( participant_server.hypercore, participant_server.hyperbeeOptions ) );
			return participant_server.hyperbee.ready().then(
				() => {
					participant_server.dht = ( participant_server.dht || options.dht ) ?? ( new HyperDHT( participant_server.hyperdhtOptions ) );
					return participant_server.dht.ready().then(
						() => {
							participant_server.rpcOptions = ( participant_server.rpcOptions || options.rpcOptions ) ?? ( { seed: participant_server.rpcSeed, dht: participant_server.dht } );
							participant_server.rpc = ( participant_server.rpc || options.rpc ) ?? ( new HyperswarmRPC( participant_server.rpcOptions ) );
							participant_server.rpcServer = ( participant_server.rpcServer || options.rpcServer ) ?? ( participant_server.rpc.createServer() );
							return participant_server.rpcServer.listen().then(
								() => {
									console.log( "Server publicKey (base64url): %s", participant_server.rpcServer.publicKey.toString( 'base64url' ) );
									participant_server.rpcServer.respond( 'ping', ( request_buffer ) => {
										const request_string = request_buffer.toString( 'utf8' );
										console.log( "Received request_string: %s", request_string );
										const response_buffer = Buffer.from( request_string+'yo.', 'utf8' );
										return response_buffer;
									} );
									return participant_server;
								},
								( error ) => {
									return_error = new Error(`participant_server.rpcServer.listen threw an error: ${error}`);
									throw return_error;
								}
							); //participant_server.rpcServer.listen
						},
						( error ) => {
							return_error = new Error(`participant_server.dht.ready threw an error: ${error}`);
							throw return_error;
						}
					); //participant_server.dht.ready
				},
				( error ) => {
					return_error = new Error(`participant_server.hyperbee.ready threw an error: ${error}`);
					throw return_error;
				}
			); //participant_server.hyperbee.ready
		},
		( error ) => {
			return_error = new Error(`participant_server.hypercore.ready threw an error: ${error}`);
			throw return_error;
		}
	); //participant_server.hypercore.ready

	//Return
	console.log(`${FUNCTION_NAME}: debug: returned: ${_return}`);
	return _return;
}

var participant_server = ParticipantServer.createAsync( { hyperdhtOptions: { port: 40001, bootstrap: [ '127.0.0.1:30001' ] } } );



